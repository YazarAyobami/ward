import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deriveTrustStage,
  deriveRequestConsensusStage,
  deriveWithdrawalTimelockStage,
  deriveChildMilestoneStage,
  deriveWizardSteps,
  Trust,
  Child,
  Rules,
} from "../src/index.js";

const BASE_RULES: Rules = {
  allowance_amount: "500000000",
  allowance_period: "2592000000000000",
  large_threshold: "2000000000",
  death_quorum: 3,
  waiting_period: "1209600000000000",
  withdraw_free_cap: "1000000000",
  withdraw_delay: "604800000000000",
  cancel_window: "2592000000000000",
  graduation_tranches: 3,
  max_open_requests: 10,
  flag_age_years: 14,
  majority_age_years: 18,
  fallback: [],
  time_scale: 1,
};

const BASE_TRUST: Trust = {
  id: 0,
  label: "Test Trust",
  settlor: "parent.testnet",
  dao: null,
  caregiver: "caregiver.testnet",
  caregiver_circle: "Maternal",
  guardians: [
    { account: "aunt.testnet", circle: "Maternal" },
    { account: "uncle.testnet", circle: "Paternal" },
    { account: "elder.testnet", circle: "Community" },
    { account: "teacher.testnet", circle: "Institution" },
  ],
  children: [
    {
      label: "Child 1",
      account: "child1.testnet",
      birth_ts: "0",
      share_bps: 10000,
      paid_out: "0",
      tranches_paid: 0,
      alive: true,
    },
  ],
  payees: [],
  rules: BASE_RULES,
  token: "usdc.testnet",
  balance: "10000000000",
  ops_balance: "1000000000000000000000000",
  status: "Funding",
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

describe("machines: TrustLifecycleMachine", () => {
  it("derives Funding stage accurately", () => {
    const stage = deriveTrustStage(BASE_TRUST);
    assert.equal(stage.stage, "Funding");
    assert.equal(stage.canDeposit, true);
    assert.equal(stage.isQuorumMet, false);
    assert.equal(stage.freeCapRemaining, 1000000000n);
  });

  it("derives DeathClaimed stage with countdown", () => {
    const claimedTrust: Trust = {
      ...BASE_TRUST,
      status: {
        DeathClaimed: {
          claimed_at: "1000000000000",
          ends_at: "2000000000000",
        },
      },
      death_attestations: [
        { guardian: "aunt.testnet", evidence_hash: Array(32).fill(1), at: "1" },
        { guardian: "uncle.testnet", evidence_hash: Array(32).fill(1), at: "2" },
      ],
    };
    const stage = deriveTrustStage(claimedTrust, 1500000000000n);
    assert.equal(stage.stage, "DeathClaimed");
    assert.equal(stage.isGracePeriodExpired, false);
    assert.equal(stage.attestations, 2);
  });

  it("derives Active stage with allowance computation", () => {
    const activeTrust: Trust = {
      ...BASE_TRUST,
      status: "Active",
      activated_at: "1000000000000000",
      allowance_claimed_until: "1000000000000000",
    };
    const stage = deriveTrustStage(activeTrust, 5000000000000000n);
    assert.equal(stage.stage, "Active");
    assert.equal(stage.canClaimAllowance, true);
    assert.ok(stage.allowanceDue > 0n);
  });
});

describe("machines: DisbursementConsensusMachine", () => {
  it("identifies PayeePayment satisfied with 1 circle", () => {
    const stage = deriveRequestConsensusStage(
      {
        kind: { PayeePayment: { payee: "school.testnet", amount: "500" } },
        approvals: [{ account: "teacher.testnet", circle: "Institution" }],
        rejections: [],
        child_flagged: false,
        status: "Pending",
      },
      "Maternal"
    );
    assert.equal(stage.stage, "ConsensusSatisfied");
  });

  it("identifies LargeSpend blocked when approved only by caregiver circle", () => {
    const stage = deriveRequestConsensusStage(
      {
        kind: { LargeSpend: { to: "vendor.testnet", amount: "5000" } },
        approvals: [{ account: "aunt.testnet", circle: "Maternal" }],
        rejections: [],
        child_flagged: false,
        status: "Pending",
      },
      "Maternal"
    );
    assert.equal(stage.stage, "PendingApprovals");
    assert.equal(stage.isCaregiverCircleBlocked, true);
  });

  it("identifies FlaggedByChild requiring 2 circles", () => {
    const stage = deriveRequestConsensusStage(
      {
        kind: { PayeePayment: { payee: "school.testnet", amount: "500" } },
        approvals: [{ account: "aunt.testnet", circle: "Maternal" }],
        rejections: [],
        child_flagged: true,
        status: "Pending",
      },
      "Maternal"
    );
    assert.equal(stage.stage, "FlaggedByChild");
    assert.equal(stage.requiredCircles, 2);
    assert.equal(stage.currentDistinctCircles, 1);
  });

  it("identifies 2-circle rejection", () => {
    const stage = deriveRequestConsensusStage(
      {
        kind: { LargeSpend: { to: "vendor.testnet", amount: "5000" } },
        approvals: [],
        rejections: [
          { account: "aunt.testnet", circle: "Maternal" },
          { account: "uncle.testnet", circle: "Paternal" },
        ],
        child_flagged: false,
        status: "Pending",
      },
      "Maternal"
    );
    assert.equal(stage.stage, "Rejected");
  });
});

describe("machines: WithdrawalTimelockMachine", () => {
  it("derives NonePending when idle", () => {
    const stage = deriveWithdrawalTimelockStage(BASE_TRUST);
    assert.equal(stage.stage, "NonePending");
    assert.equal(stage.freeCapRemaining, 1000000000n);
  });

  it("derives ReviewWindow with veto count", () => {
    const timelockedTrust: Trust = {
      ...BASE_TRUST,
      pending_withdrawal: {
        amount: "5000000000",
        requested_at: "1000000000",
        execute_after: "2000000000",
        vetoes: [{ account: "aunt.testnet", circle: "Maternal" }],
      },
    };
    const stage = deriveWithdrawalTimelockStage(timelockedTrust, 1500000000n);
    assert.equal(stage.stage, "ReviewWindow");
    assert.equal(stage.vetoCount, 1);
    assert.equal(stage.isExpired, false);
  });

  it("derives Vetoed when 2 distinct circles veto", () => {
    const vetoedTrust: Trust = {
      ...BASE_TRUST,
      pending_withdrawal: {
        amount: "5000000000",
        requested_at: "1000000000",
        execute_after: "2000000000",
        vetoes: [
          { account: "aunt.testnet", circle: "Maternal" },
          { account: "uncle.testnet", circle: "Paternal" },
        ],
      },
    };
    const stage = deriveWithdrawalTimelockStage(vetoedTrust, 1500000000n);
    assert.equal(stage.stage, "Vetoed");
  });
});

describe("machines: ChildMilestoneMachine", () => {
  const nsPerYear = 365n * 24n * 3600n * 1_000_000_000n;
  const now = 20n * nsPerYear; // Simulated time at 20 years

  it("derives Minor for age < 14", () => {
    const child: Child = {
      label: "Baby",
      account: null,
      birth_ts: (now - 10n * nsPerYear).toString(), // 10 years old
      share_bps: 5000,
      paid_out: "0",
      tranches_paid: 0,
      alive: true,
    };
    const stage = deriveChildMilestoneStage(child, BASE_RULES, now);
    assert.equal(stage.stage, "Minor");
    assert.equal(stage.canFlag, false);
    assert.equal(stage.canGraduate, false);
    assert.equal(stage.yearsUntilFlagRights, 4);
  });

  it("derives Watchdog for age 14-17", () => {
    const child: Child = {
      label: "Teen",
      account: "teen.testnet",
      birth_ts: (now - 16n * nsPerYear).toString(), // 16 years old
      share_bps: 5000,
      paid_out: "0",
      tranches_paid: 0,
      alive: true,
    };
    const stage = deriveChildMilestoneStage(child, BASE_RULES, now);
    assert.equal(stage.stage, "Watchdog");
    assert.equal(stage.canFlag, true);
    assert.equal(stage.canGraduate, false);
  });

  it("derives Graduating for age >= 18", () => {
    const child: Child = {
      label: "Adult",
      account: "adult.testnet",
      birth_ts: (now - 19n * nsPerYear).toString(), // 19 years old
      share_bps: 5000,
      paid_out: "0",
      tranches_paid: 1,
      alive: true,
    };
    const stage = deriveChildMilestoneStage(child, BASE_RULES, now);
    assert.equal(stage.stage, "Graduating");
    assert.equal(stage.canGraduate, true);
    assert.equal(stage.tranchesPaid, 1);
  });
});

describe("machines: CreateTrustWizardMachine", () => {
  it("derives wizard step completion accurately", () => {
    const steps = deriveWizardSteps({
      label: "My Trust",
      caregiver: "caregiver.testnet",
      caregiverCircle: "Maternal",
      children: [
        { label: "Child 1", birth_ts: "1000", share_bps: 5000 },
        { label: "Child 2", birth_ts: "1000", share_bps: 5000 },
      ],
      guardians: [
        { account: "g1.testnet", circle: "Maternal" },
        { account: "g2.testnet", circle: "Paternal" },
        { account: "g3.testnet", circle: "Community" },
      ],
      token: "usdc.testnet",
      deathQuorum: 2,
    });

    assert.equal(steps.length, 5);
    assert.equal(steps[0]?.isComplete, true);
    assert.equal(steps[1]?.isComplete, true);
    assert.equal(steps[2]?.isComplete, true);
    assert.equal(steps[3]?.isComplete, true);
    assert.equal(steps[4]?.isComplete, true);
  });
});
