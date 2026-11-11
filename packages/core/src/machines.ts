// Explicit, typesafe state machines for Ward contracts and UI (W-11.x).
// Eliminates implicit booleans, elevates UX (clear status & affordances), DX (exhaustive typing), and AX (deterministic agent inspection).
import type {
  Approval,
  Child,
  ChildInput,
  Circle,
  Guardian,
  Request,
  Rules,
  Trust,
} from "./types.js";
import {
  distinctCircles,
  isSatisfied,
  requiresTwoCircles,
  allowanceDue,
  NS_PER_YEAR,
  NS_PER_SECOND,
  validateGuardians,
  validateShares,
} from "./rules.js";

/* -------------------------------------------------------------------------- */
/* 1. TRUST LIFECYCLE STATE MACHINE                                           */
/* -------------------------------------------------------------------------- */

export type TrustStage =
  | {
      stage: "Funding";
      label: "Funding & Setup";
      canDeposit: true;
      canWithdraw: boolean;
      freeCapRemaining: bigint;
      isWithdrawalPending: boolean;
      deathAttestations: number;
      deathQuorum: number;
      isQuorumMet: boolean;
    }
  | {
      stage: "DeathClaimed";
      label: "Death Verification Grace Period";
      gracePeriodEndsAtNs: bigint;
      isGracePeriodExpired: boolean;
      secondsRemaining: number;
      canDismissFraud: true;
      attestations: number;
      quorum: number;
    }
  | {
      stage: "Active";
      label: "Active Post-Death Support";
      allowanceDue: bigint;
      canClaimAllowance: boolean;
      allowanceClaimedUntilNs: bigint;
      isPaused: boolean;
      balance: bigint;
    }
  | {
      stage: "Graduating";
      label: "Beneficiary Graduation";
      allChildrenAdults: boolean;
      tranchesRemaining: number;
      balance: bigint;
    }
  | {
      stage: "Closed";
      label: "Trust Settled & Closed";
      allSharesDisbursed: true;
    };

export function deriveTrustStage(trust: Trust, nowNs?: bigint): TrustStage {
  const now = nowNs ?? BigInt(Date.now()) * 1_000_000n;
  const balance = BigInt(trust.balance || "0");
  const freeWithdrawn = BigInt(trust.free_withdrawn || "0");
  const freeCap = BigInt(trust.rules.withdraw_free_cap || "0");
  const freeCapRemaining = freeCap > freeWithdrawn ? freeCap - freeWithdrawn : 0n;

  if (trust.status === "Funding") {
    const attestations = trust.death_attestations?.length || 0;
    const quorum = trust.rules.death_quorum;
    return {
      stage: "Funding",
      label: "Funding & Setup",
      canDeposit: true,
      canWithdraw: true,
      freeCapRemaining,
      isWithdrawalPending: trust.pending_withdrawal !== null,
      deathAttestations: attestations,
      deathQuorum: quorum,
      isQuorumMet: attestations >= quorum,
    };
  }

  if (typeof trust.status === "object" && "DeathClaimed" in trust.status) {
    const endsAt = BigInt(trust.status.DeathClaimed.ends_at);
    const isExpired = now >= endsAt;
    const diffNs = endsAt > now ? endsAt - now : 0n;
    const secondsRemaining = Number(diffNs / NS_PER_SECOND);
    return {
      stage: "DeathClaimed",
      label: "Death Verification Grace Period",
      gracePeriodEndsAtNs: endsAt,
      isGracePeriodExpired: isExpired,
      secondsRemaining,
      canDismissFraud: true,
      attestations: trust.death_attestations?.length || 0,
      quorum: trust.rules.death_quorum,
    };
  }

  if (trust.status === "Active") {
    const dueStr = allowanceDue(trust, now);
    const due = BigInt(dueStr);
    return {
      stage: "Active",
      label: "Active Post-Death Support",
      allowanceDue: due,
      canClaimAllowance: due > 0n && !trust.paused,
      allowanceClaimedUntilNs: BigInt(trust.allowance_claimed_until || "0"),
      isPaused: trust.paused,
      balance,
    };
  }

  if (trust.status === "Graduating") {
    const tranchesRemaining = trust.children.reduce(
      (acc, c) => acc + Math.max(0, trust.rules.graduation_tranches - c.tranches_paid),
      0
    );
    const allAdults = trust.children.every((c) => {
      const birthTs = BigInt(c.birth_ts);
      const ageYears = Number((now - birthTs) / NS_PER_YEAR);
      return ageYears >= trust.rules.majority_age_years;
    });

    return {
      stage: "Graduating",
      label: "Beneficiary Graduation",
      allChildrenAdults: allAdults,
      tranchesRemaining,
      balance,
    };
  }

  return {
    stage: "Closed",
    label: "Trust Settled & Closed",
    allSharesDisbursed: true,
  };
}

export function getTrustStageDetails(stage: TrustStage): {
  badgeText: string;
  variant: "amber" | "neutral" | "emerald" | "rose" | "purple";
  description: string;
} {
  switch (stage.stage) {
    case "Funding":
      return {
        badgeText: "Funding & Setup",
        variant: "neutral",
        description: "Trust is open for contributions and guardian setup. Settlor is active.",
      };
    case "DeathClaimed":
      return {
        badgeText: "Grace Period Active",
        variant: "rose",
        description: stage.isGracePeriodExpired
          ? "Grace period complete. Trust ready to transition to Active support."
          : `Death attestations received. Fraud dismissal window active (${stage.secondsRemaining}s remaining).`,
      };
    case "Active":
      return {
        badgeText: stage.isPaused ? "Paused" : "Active Support",
        variant: stage.isPaused ? "rose" : "emerald",
        description: stage.isPaused
          ? "Trust operations are temporarily paused by guardian consensus."
          : `Protected maintenance active. Allowance currently claimable: ${stage.canClaimAllowance ? "Yes" : "No pending allowance"}.`,
      };
    case "Graduating":
      return {
        badgeText: "Graduation Phase",
        variant: "purple",
        description: `Beneficiaries reaching majority. ${stage.tranchesRemaining} graduation tranches pending release.`,
      };
    case "Closed":
      return {
        badgeText: "Settled & Closed",
        variant: "neutral",
        description: "All beneficiary tranches and funds have been fully disbursed.",
      };
  }
}

/* -------------------------------------------------------------------------- */
/* 2. DISBURSEMENT REQUEST CONSENSUS MACHINE                                  */
/* -------------------------------------------------------------------------- */

export type RequestConsensusStage =
  | {
      stage: "PendingApprovals";
      label: "Awaiting Approvals";
      requiredCircles: number;
      approvedCircles: Circle[];
      currentDistinctCircles: number;
      missingCirclesCount: number;
      isCaregiverCircleBlocked: boolean;
      isChildFlagged: boolean;
    }
  | {
      stage: "FlaggedByChild";
      label: "Flagged by Beneficiary (2-Circle Consensus Required)";
      requiredCircles: 2;
      approvedCircles: Circle[];
      currentDistinctCircles: number;
      missingCirclesCount: number;
      isChildFlagged: true;
    }
  | {
      stage: "ConsensusSatisfied";
      label: "Consensus Reached (Ready to Execute)";
      approvedCircles: Circle[];
      approverAccounts: string[];
    }
  | {
      stage: "Rejected";
      label: "Rejected by Multi-Circle Guardians";
      rejectionCircles: Circle[];
    }
  | {
      stage: "Executed";
      label: "Disbursed";
    };

export function deriveRequestConsensusStage(
  request: {
    kind: Request["kind"];
    approvals: Approval[];
    rejections: Approval[];
    child_flagged: boolean;
    status: string;
  },
  caregiverCircle: Circle,
  trust?: Trust
): RequestConsensusStage {
  if (request.status === "Executed") {
    return { stage: "Executed", label: "Disbursed" };
  }

  // Check 2-circle rejection rule
  const isReqRejected = distinctCircles(request.rejections) >= 2 || request.status === "Rejected";
  if (isReqRejected) {
    const rejCircles = Array.from(new Set(request.rejections.map((r) => r.circle)));
    return {
      stage: "Rejected",
      label: "Rejected by Multi-Circle Guardians",
      rejectionCircles: rejCircles,
    };
  }

  // Check satisfaction
  const dummyTrust: Trust = trust ?? {
    id: 0,
    label: "",
    settlor: "",
    dao: null,
    caregiver: "",
    caregiver_circle: caregiverCircle,
    guardians: [],
    children: [],
    payees: [],
    rules: {
      allowance_amount: "0",
      allowance_period: "0",
      large_threshold: "0",
      death_quorum: 2,
      waiting_period: "0",
      withdraw_free_cap: "0",
      withdraw_delay: "0",
      cancel_window: "0",
      graduation_tranches: 3,
      max_open_requests: 10,
      flag_age_years: 14,
      majority_age_years: 18,
      fallback: [],
      time_scale: 1,
    },
    token: "",
    balance: "0",
    ops_balance: "0",
    status: "Active",
    paused: false,
    death_attestations: [],
    cancel_window: null,
    pending_withdrawal: null,
    free_withdrawn: "0",
    free_period_start: "0",
    allowance_claimed_until: "0",
    activated_at: null,
    activation_balance: null,
    created_at: "0",
  };

  const reqObj: Request = {
    id: 0,
    trust_id: 0,
    kind: request.kind,
    created_by: "",
    reason: "",
    receipt_hash: null,
    ai_review: null,
    approvals: request.approvals,
    rejections: request.rejections,
    child_flagged: request.child_flagged,
    status: (["Pending", "Approved", "Rejected", "Executed"].includes(request.status)
      ? request.status
      : "Pending") as Request["status"],
    created_at: "0",
  };

  if (isSatisfied(dummyTrust, reqObj) || request.status === "Approved") {
    return {
      stage: "ConsensusSatisfied",
      label: "Consensus Reached (Ready to Execute)",
      approvedCircles: Array.from(new Set(request.approvals.map((a) => a.circle))),
      approverAccounts: request.approvals.map((a) => a.account),
    };
  }

  const approvedCircles = Array.from(new Set(request.approvals.map((a) => a.circle)));
  const curCircles = distinctCircles(request.approvals);
  const neededCircles = requiresTwoCircles(request.kind, request.child_flagged) ? 2 : 1;
  const missingCount = Math.max(0, neededCircles - curCircles);

  const isLargeSpend = typeof request.kind === "object" && "LargeSpend" in request.kind;
  const isCaregiverCircleBlocked =
    isLargeSpend && approvedCircles.length === 1 && approvedCircles[0] === caregiverCircle;

  if (request.child_flagged) {
    return {
      stage: "FlaggedByChild",
      label: "Flagged by Beneficiary (2-Circle Consensus Required)",
      requiredCircles: 2,
      approvedCircles,
      currentDistinctCircles: curCircles,
      missingCirclesCount: missingCount,
      isChildFlagged: true,
    };
  }

  return {
    stage: "PendingApprovals",
    label: "Awaiting Approvals",
    requiredCircles: neededCircles,
    approvedCircles,
    currentDistinctCircles: curCircles,
    missingCirclesCount: missingCount,
    isCaregiverCircleBlocked,
    isChildFlagged: false,
  };
}

/* -------------------------------------------------------------------------- */
/* 3. SETTLOR WITHDRAWAL & ANTI-THEFT TIMELOCK MACHINE                        */
/* -------------------------------------------------------------------------- */

export type WithdrawalTimelockStage =
  | {
      stage: "NonePending";
      label: "No Timelocked Withdrawals";
      freeCapTotal: bigint;
      freeCapUsed: bigint;
      freeCapRemaining: bigint;
    }
  | {
      stage: "ReviewWindow";
      label: "Timelocked Under Multi-Circle Review";
      amount: bigint;
      executeAfterNs: bigint;
      secondsRemaining: number;
      isExpired: boolean;
      vetoCount: number;
      vetoCircles: Circle[];
      vetoesNeeded: 2;
      canExecute: boolean;
    }
  | {
      stage: "Vetoed";
      label: "Vetoed by Multi-Circle Guardians";
      amount: bigint;
    };

export function deriveWithdrawalTimelockStage(
  trust: Trust,
  nowNs?: bigint
): WithdrawalTimelockStage {
  const now = nowNs ?? BigInt(Date.now()) * 1_000_000n;
  const freeCap = BigInt(trust.rules.withdraw_free_cap || "0");
  const freeUsed = BigInt(trust.free_withdrawn || "0");
  const freeRemaining = freeCap > freeUsed ? freeCap - freeUsed : 0n;

  if (!trust.pending_withdrawal) {
    return {
      stage: "NonePending",
      label: "No Timelocked Withdrawals",
      freeCapTotal: freeCap,
      freeCapUsed: freeUsed,
      freeCapRemaining: freeRemaining,
    };
  }

  const pw = trust.pending_withdrawal;
  const vetoCircles = Array.from(new Set(pw.vetoes.map((v) => v.circle)));
  const isVetoed = distinctCircles(pw.vetoes) >= 2;

  if (isVetoed) {
    return {
      stage: "Vetoed",
      label: "Vetoed by Multi-Circle Guardians",
      amount: BigInt(pw.amount),
    };
  }

  const executeAfter = BigInt(pw.execute_after);
  const isExpired = now >= executeAfter;
  const diffNs = executeAfter > now ? executeAfter - now : 0n;
  const secondsRemaining = Number(diffNs / NS_PER_SECOND);

  return {
    stage: "ReviewWindow",
    label: "Timelocked Under Multi-Circle Review",
    amount: BigInt(pw.amount),
    executeAfterNs: executeAfter,
    secondsRemaining,
    isExpired,
    vetoCount: vetoCircles.length,
    vetoCircles,
    vetoesNeeded: 2,
    canExecute: isExpired && !isVetoed,
  };
}

/* -------------------------------------------------------------------------- */
/* 4. CHILD BENEFICIARY RIGHTS & MILESTONE MACHINE                            */
/* -------------------------------------------------------------------------- */

export type ChildMilestoneStage =
  | {
      stage: "Minor";
      label: string;
      ageYears: number;
      yearsUntilFlagRights: number;
      canFlag: false;
      canGraduate: false;
      hasWallet: boolean;
      shareBps: number;
      paidOut: bigint;
    }
  | {
      stage: "Watchdog";
      label: string;
      ageYears: number;
      yearsUntilMajority: number;
      canFlag: true;
      canGraduate: false;
      hasWallet: boolean;
      shareBps: number;
      paidOut: bigint;
    }
  | {
      stage: "Graduating";
      label: string;
      ageYears: number;
      canFlag: false;
      canGraduate: boolean;
      tranchesPaid: number;
      totalTranches: number;
      isComplete: boolean;
      hasWallet: boolean;
      requiresGuardianWalletRegistration: boolean;
      shareBps: number;
      paidOut: bigint;
    };

export function deriveChildMilestoneStage(
  child: Child,
  rules: Rules,
  nowNs?: bigint
): ChildMilestoneStage {
  const now = nowNs ?? BigInt(Date.now()) * 1_000_000n;
  const birthTs = BigInt(child.birth_ts);
  const ageYears = Number((now - birthTs) / NS_PER_YEAR);
  const hasWallet = child.account !== null && child.account.trim().length > 0;
  const paidOut = BigInt(child.paid_out || "0");

  if (ageYears < rules.flag_age_years) {
    return {
      stage: "Minor",
      label: `Minor Ward (${ageYears}yo)`,
      ageYears,
      yearsUntilFlagRights: Math.max(0, rules.flag_age_years - ageYears),
      canFlag: false,
      canGraduate: false,
      hasWallet,
      shareBps: child.share_bps,
      paidOut,
    };
  }

  if (ageYears < rules.majority_age_years) {
    return {
      stage: "Watchdog",
      label: `Adolescent Watchdog (${ageYears}yo)`,
      ageYears,
      yearsUntilMajority: Math.max(0, rules.majority_age_years - ageYears),
      canFlag: true,
      canGraduate: false,
      hasWallet,
      shareBps: child.share_bps,
      paidOut,
    };
  }

  const isComplete = child.tranches_paid >= rules.graduation_tranches;
  return {
    stage: "Graduating",
    label: isComplete
      ? "Sovereign Adult (Graduation Complete)"
      : `Adult Sovereign (${child.tranches_paid}/${rules.graduation_tranches} Tranches Paid)`,
    ageYears,
    canFlag: false,
    canGraduate: !isComplete && hasWallet,
    tranchesPaid: child.tranches_paid,
    totalTranches: rules.graduation_tranches,
    isComplete,
    hasWallet,
    requiresGuardianWalletRegistration: !hasWallet,
    shareBps: child.share_bps,
    paidOut,
  };
}

/* -------------------------------------------------------------------------- */
/* 5. CREATE TRUST WIZARD MULTI-STEP STATE MACHINE                            */
/* -------------------------------------------------------------------------- */

export interface WizardDraft {
  label: string;
  caregiver: string;
  caregiverCircle: Circle;
  children: ChildInput[];
  guardians: Guardian[];
  token: string;
  allowanceMonthly: string;
  largeThreshold: string;
  deathQuorum: number;
  waitingPeriodDays: number;
  withdrawFreeCap: string;
  graduationTranches: number;
  timeScale: number;
}

export interface WizardStepStatus {
  step: 1 | 2 | 3 | 4 | 5;
  title: string;
  isComplete: boolean;
  canEnter: boolean;
  errors: string[];
}

export function deriveWizardSteps(draft: Partial<WizardDraft>): WizardStepStatus[] {
  // Step 1: Trust & Caregiver
  const step1Errors: string[] = [];
  if (!draft.label || draft.label.trim().length === 0) {
    step1Errors.push("Trust label is required.");
  }
  if (!draft.caregiver || draft.caregiver.trim().length === 0) {
    step1Errors.push("Caregiver account is required.");
  }
  if (!draft.caregiverCircle) {
    step1Errors.push("Caregiver social circle is required.");
  }
  const isStep1Complete = step1Errors.length === 0;

  // Step 2: Children & Shares
  const step2Errors: string[] = [];
  const children = draft.children || [];
  if (children.length === 0) {
    step2Errors.push("At least one child beneficiary is required.");
  } else {
    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      if (!c || !c.label || c.label.trim().length === 0) {
        step2Errors.push(`Child #${i + 1} must have a name/label.`);
      }
    }
    const sharesErr = validateShares(children);
    if (sharesErr) {
      step2Errors.push("Beneficiary shares must sum to exactly 10,000 basis points (100%).");
    }
  }
  const isStep2Complete = isStep1Complete && step2Errors.length === 0;

  // Step 3: Guardians & Circles
  const step3Errors: string[] = [];
  const guardians = draft.guardians || [];
  const gErr = validateGuardians(guardians, draft.caregiver || "");
  if (gErr) {
    step3Errors.push(gErr);
  }
  const isStep3Complete = isStep2Complete && step3Errors.length === 0;

  // Step 4: Rules & Token
  const step4Errors: string[] = [];
  if (!draft.token || draft.token.trim().length === 0) {
    step4Errors.push("Token account ID is required.");
  }
  if (!draft.deathQuorum || draft.deathQuorum < 2) {
    step4Errors.push("Death attestation quorum must be at least 2 guardians.");
  }
  const isStep4Complete = isStep3Complete && step4Errors.length === 0;

  // Step 5: Review
  const isStep5Complete = isStep4Complete;

  return [
    {
      step: 1,
      title: "Trust & Caregiver",
      isComplete: isStep1Complete,
      canEnter: true,
      errors: step1Errors,
    },
    {
      step: 2,
      title: "Children & Shares",
      isComplete: isStep2Complete,
      canEnter: isStep1Complete,
      errors: step2Errors,
    },
    {
      step: 3,
      title: "Guardian Circles",
      isComplete: isStep3Complete,
      canEnter: isStep2Complete,
      errors: step3Errors,
    },
    {
      step: 4,
      title: "Economic Rules",
      isComplete: isStep4Complete,
      canEnter: isStep3Complete,
      errors: step4Errors,
    },
    {
      step: 5,
      title: "Review & Deploy",
      isComplete: isStep5Complete,
      canEnter: isStep4Complete,
      errors: [],
    },
  ];
}
