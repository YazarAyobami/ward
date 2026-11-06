// Mirror of contracts/ward/src/rules.rs for UI previews (W-6.2). PURE. Change both together.
import type { Approval, ChildInput, Circle, Guardian, Request, Trust } from "./types.js";

export const NS_PER_SECOND = 1_000_000_000n;
export const NS_PER_DAY = 86_400n * NS_PER_SECOND;
export const NS_PER_MONTH = 30n * NS_PER_DAY;
export const NS_PER_YEAR = 365n * NS_PER_DAY;

export const CIRCLE_COUNT = 4;
export const SHARES_TOTAL_BPS = 10_000;

export const ERRORS = {
  E07_GUARDIAN_COUNT: "E07_GUARDIAN_COUNT: a trust needs 3 to 5 guardians",
  E08_CIRCLE_LIMIT: "E08_CIRCLE_LIMIT: at most 2 guardians per circle",
  E09_CIRCLE_DIVERSITY: "E09_CIRCLE_DIVERSITY: guardians must span at least 2 circles",
  E10_SHARES_SUM: "E10_SHARES_SUM: child shares must sum to 10000 bps",
  E11_CAREGIVER_IS_GUARDIAN: "E11_CAREGIVER_IS_GUARDIAN: the caregiver cannot be a guardian",
  E35_DUPLICATE_GUARDIAN: "E35_DUPLICATE_GUARDIAN: each guardian must be a distinct account",
} as const;

export function circleIndex(circle: Circle): number {
  switch (circle) {
    case "Maternal":
      return 0;
    case "Paternal":
      return 1;
    case "Community":
      return 2;
    case "Institution":
      return 3;
  }
}

/**
 * 3..=5 distinct guardians, ≤2 per circle, ≥2 circles, caregiver not a guardian (E07–E09, E11, E35).
 * Returns null if valid, or an error string if invalid.
 */
export function validateGuardians(guardians: Guardian[], caregiver: string): string | null {
  if (guardians.length < 3 || guardians.length > 5) {
    return ERRORS.E07_GUARDIAN_COUNT;
  }
  if (guardians.some((g) => g.account === caregiver)) {
    return ERRORS.E11_CAREGIVER_IS_GUARDIAN;
  }

  // A repeated account would shrink the real quorum while still passing the count check.
  for (let i = 0; i < guardians.length; i++) {
    const current = guardians[i];
    if (!current) continue;
    for (let j = i + 1; j < guardians.length; j++) {
      const other = guardians[j];
      if (other && other.account === current.account) {
        return ERRORS.E35_DUPLICATE_GUARDIAN;
      }
    }
  }

  const perCircle = [0, 0, 0, 0];
  for (const guardian of guardians) {
    perCircle[circleIndex(guardian.circle)]! += 1;
  }

  if (perCircle.some((count) => count > 2)) {
    return ERRORS.E08_CIRCLE_LIMIT;
  }
  if (perCircle.filter((count) => count > 0).length < 2) {
    return ERRORS.E09_CIRCLE_DIVERSITY;
  }

  return null;
}

/**
 * Child shares must sum to 10,000 basis points (100%).
 */
export function validateShares(children: ChildInput[]): string | null {
  let total = 0;
  for (const child of children) {
    total += child.share_bps;
  }
  if (total !== SHARES_TOTAL_BPS) {
    return ERRORS.E10_SHARES_SUM;
  }
  return null;
}

/**
 * Number of distinct circles among approvals.
 */
export function distinctCircles(approvals: Approval[]): number {
  const seen = [false, false, false, false];
  for (const approval of approvals) {
    seen[circleIndex(approval.circle)] = true;
  }
  return seen.filter(Boolean).length;
}

/**
 * Does this request kind require 2-circle guardian consensus?
 */
export function requiresTwoCircles(kind: Request["kind"], childFlagged: boolean): boolean {
  if (childFlagged) {
    return true;
  }
  if (typeof kind === "string") {
    // "Unpause" requires two circles; "VouchCancel" requires one
    return kind === "Unpause";
  }
  if ("PayeePayment" in kind) {
    return false;
  }
  // LargeSpend, SetChildAccount, ChildDeceased
  return true;
}

/**
 * Is the request's approval rule met (ARCHITECTURE §6)?
 */
export function isSatisfied(trust: Trust, request: Request): boolean {
  if (request.approvals.length === 0) {
    return false;
  }
  const isPayeeOrVouch =
    (typeof request.kind === "string" && request.kind === "VouchCancel") ||
    (typeof request.kind === "object" && "PayeePayment" in request.kind);

  if (isPayeeOrVouch && !request.child_flagged) {
    return true;
  }

  if (typeof request.kind === "object" && "LargeSpend" in request.kind) {
    return (
      distinctCircles(request.approvals) >= 2 &&
      request.approvals.some((a) => a.circle !== trust.caregiver_circle)
    );
  }

  return distinctCircles(request.approvals) >= 2;
}

/**
 * Rejected once 2 rejections from different circles.
 */
export function isRejected(request: Request): boolean {
  return distinctCircles(request.rejections) >= 2;
}

/**
 * Circle of a guardian in the trust, or null if not a guardian.
 */
export function circleOf(trust: Trust, account: string): Circle | null {
  const guardian = trust.guardians.find((g) => g.account === account);
  return guardian ? guardian.circle : null;
}

function effectiveScale(timeScale: number): bigint {
  return BigInt(Math.max(1, timeScale));
}

/**
 * Conceptual duration -> chain duration.
 */
export function scaled(durationNs: bigint, timeScale: number): bigint {
  return durationNs / effectiveScale(timeScale);
}

/**
 * Whole periods between two chain timestamps. periodNs is conceptual.
 */
export function periodsElapsed(
  fromNs: bigint,
  toNs: bigint,
  periodNs: bigint,
  timeScale: number
): bigint {
  if (periodNs === 0n) {
    return 0n;
  }
  const scaledChain = scaled(periodNs, timeScale);
  const periodChainNs = scaledChain > 0n ? scaledChain : 1n;
  if (toNs <= fromNs) {
    return 0n;
  }
  return (toNs - fromNs) / periodChainNs;
}

/**
 * Age in whole years, with time scaling applied to elapsed time since birth.
 */
export function ageYears(birthNs: bigint, nowNs: bigint, timeScale: number): number {
  if (nowNs <= birthNs) {
    return 0;
  }
  const elapsedNs = nowNs - birthNs;
  const conceptualNs = elapsedNs * effectiveScale(timeScale);
  const years = conceptualNs / NS_PER_YEAR;
  return Number(years > 255n ? 255n : years);
}

/**
 * Allowance due now (max 1 period of arrears, never above balance).
 */
export function allowanceDue(trust: Trust, nowNs: bigint): bigint {
  const status = typeof trust.status === "string" ? trust.status : null;
  if (status !== "Active" && status !== "Graduating") {
    return 0n;
  }
  const periodNs = BigInt(trust.rules.allowance_period);
  if (periodNs === 0n) {
    return 0n;
  }

  const claimedUntil = BigInt(trust.allowance_claimed_until);
  const startNs =
    claimedUntil !== 0n
      ? claimedUntil
      : trust.activated_at
      ? BigInt(trust.activated_at)
      : BigInt(trust.created_at);

  const periods = periodsElapsed(startNs, nowNs, periodNs, trust.rules.time_scale);
  if (periods === 0n) {
    return 0n;
  }

  const allowanceAmount = BigInt(trust.rules.allowance_amount);
  const balance = BigInt(trust.balance);
  return allowanceAmount < balance ? allowanceAmount : balance;
}

/**
 * Remaining share for a child, scaled by shared spends since activation.
 *
 * Shared spends (allowance, approved payments) reduce the common balance, so the child's claim
 * scales with it. Living children's graduation payouts are added back to the pool before applying
 * `share_bps` and each child's own payout is then subtracted. A dead child's payouts are not added back.
 */
export function remainingShare(trust: Trust, childIdx: number): bigint {
  const child = trust.children[childIdx];
  if (!child || !child.alive) {
    return 0n;
  }

  let livingPaidOut = 0n;
  for (const c of trust.children) {
    if (c.alive) {
      livingPaidOut += BigInt(c.paid_out);
    }
  }

  const balance = BigInt(trust.balance);
  const totalPool = balance + livingPaidOut;
  const childShare = (totalPool * BigInt(child.share_bps)) / BigInt(SHARES_TOTAL_BPS);
  const paidOut = BigInt(child.paid_out);

  return childShare > paidOut ? childShare - paidOut : 0n;
}
