import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateGuardians,
  validateShares,
  distinctCircles,
  isSatisfied,
  isRejected,
  requiresTwoCircles,
  circleOf,
  allowanceDue,
  remainingShare,
  periodsElapsed,
  ageYears,
  scaled,
  ERRORS,
  NS_PER_SECOND,
  NS_PER_DAY,
  NS_PER_MONTH,
  NS_PER_YEAR,
} from "../src/rules.js";
import type { Approval, ChildInput, Guardian, Request, Trust } from "../src/types.js";

function sampleGuardians(): Guardian[] {
  return [
    { account: "aunt.near", circle: "Maternal" },
    { account: "uncle.near", circle: "Paternal" },
    { account: "pastor.near", circle: "Community" },
  ];
}

function sampleTrust(): Trust {
  return {
    id: 0,
    label: "Family Trust",
    settlor: "settlor.near",
    dao: null,
    caregiver: "caregiver.near",
    caregiver_circle: "Paternal",
    guardians: sampleGuardians(),
    children: [
      {
        label: "Ada",
        account: "ada.near",
        birth_ts: "0",
        share_bps: 5000,
        paid_out: "0",
        tranches_paid: 0,
        alive: true,
      },
      {
        label: "Tobi",
        account: "tobi.near",
        birth_ts: "0",
        share_bps: 5000,
        paid_out: "0",
        tranches_paid: 0,
        alive: true,
      },
    ],
    payees: [{ account: "school.near", label: "School", kind: "School" }],
    rules: {
      allowance_amount: "150000000",
      allowance_period: NS_PER_MONTH.toString(),
      large_threshold: "1000000000",
      death_quorum: 3,
      waiting_period: "0",
      withdraw_free_cap: "500000000",
      withdraw_delay: "604800000000000",
      cancel_window: "1209600000000000",
      graduation_tranches: 4,
      max_open_requests: 5,
      flag_age_years: 14,
      majority_age_years: 18,
      fallback: [],
      time_scale: 1,
    },
    token: "usdc.near",
    balance: "2000000000",
    ops_balance: "0",
    status: "Active",
    paused: false,
    death_attestations: [],
    cancel_window: null,
    pending_withdrawal: null,
    free_withdrawn: "0",
    free_period_start: "0",
    allowance_claimed_until: "0",
    activated_at: "0",
    activation_balance: "2000000000",
    created_at: "0",
  };
}

function sampleRequest(kind: Request["kind"]): Request {
  return {
    id: 0,
    trust_id: 0,
    kind,
    created_by: "caregiver.near",
    reason: "test request",
    receipt_hash: null,
    ai_review: null,
    approvals: [],
    rejections: [],
    child_flagged: false,
    status: "Pending",
    created_at: "0",
  };
}

describe("rules: validateGuardians_matches_rust_cases", () => {
  it("accepts valid set", () => {
    assert.equal(validateGuardians(sampleGuardians(), "caregiver.near"), null);
  });

  it("rejects fewer than three guardians", () => {
    const set: Guardian[] = [
      { account: "aunt.near", circle: "Maternal" },
      { account: "uncle.near", circle: "Paternal" },
    ];
    assert.equal(validateGuardians(set, "caregiver.near"), ERRORS.E07_GUARDIAN_COUNT);
  });

  it("rejects more than five guardians", () => {
    const set: Guardian[] = [
      { account: "g1.near", circle: "Maternal" },
      { account: "g2.near", circle: "Paternal" },
      { account: "g3.near", circle: "Community" },
      { account: "g4.near", circle: "Institution" },
      { account: "g5.near", circle: "Maternal" },
      { account: "g6.near", circle: "Paternal" },
    ];
    assert.equal(validateGuardians(set, "caregiver.near"), ERRORS.E07_GUARDIAN_COUNT);
  });

  it("rejects three guardians in one circle", () => {
    const set: Guardian[] = [
      { account: "g1.near", circle: "Maternal" },
      { account: "g2.near", circle: "Maternal" },
      { account: "g3.near", circle: "Maternal" },
    ];
    assert.equal(validateGuardians(set, "caregiver.near"), ERRORS.E08_CIRCLE_LIMIT);
  });

  it("rejects single circle", () => {
    const oneCircle: Guardian[] = [
      { account: "g1.near", circle: "Paternal" },
      { account: "g2.near", circle: "Paternal" },
    ];
    assert.notEqual(validateGuardians(oneCircle, "caregiver.near"), null);

    const threeInOne: Guardian[] = [
      { account: "g1.near", circle: "Paternal" },
      { account: "g2.near", circle: "Paternal" },
      { account: "g3.near", circle: "Paternal" },
    ];
    assert.notEqual(validateGuardians(threeInOne, "caregiver.near"), null);
  });

  it("rejects caregiver as guardian", () => {
    assert.equal(validateGuardians(sampleGuardians(), "aunt.near"), ERRORS.E11_CAREGIVER_IS_GUARDIAN);
  });

  it("rejects the same account twice", () => {
    const set: Guardian[] = [
      { account: "aunt.near", circle: "Maternal" },
      { account: "uncle.near", circle: "Paternal" },
      { account: "aunt.near", circle: "Community" },
      { account: "teacher.near", circle: "Institution" },
    ];
    assert.equal(validateGuardians(set, "caregiver.near"), ERRORS.E35_DUPLICATE_GUARDIAN);
  });
});

describe("rules: validateShares_matches_rust_cases", () => {
  it("shares must sum to ten thousand bps", () => {
    const valid: ChildInput[] = [
      { label: "Ada", birth_ts: "0", share_bps: 5000 },
      { label: "Tobi", birth_ts: "0", share_bps: 5000 },
    ];
    assert.equal(validateShares(valid), null);

    const short: ChildInput[] = [
      { label: "Ada", birth_ts: "0", share_bps: 5000 },
      { label: "Tobi", birth_ts: "0", share_bps: 4999 },
    ];
    assert.equal(validateShares(short), ERRORS.E10_SHARES_SUM);

    const over: ChildInput[] = [
      { label: "Ada", birth_ts: "0", share_bps: 6000 },
      { label: "Tobi", birth_ts: "0", share_bps: 5000 },
    ];
    assert.equal(validateShares(over), ERRORS.E10_SHARES_SUM);

    assert.equal(validateShares([]), ERRORS.E10_SHARES_SUM);
  });
});

describe("rules: distinctCircles_matches_rust_cases", () => {
  it("counts unique circles", () => {
    const votes: Approval[] = [
      { account: "g1.near", circle: "Maternal" },
      { account: "g2.near", circle: "Maternal" },
      { account: "g3.near", circle: "Paternal" },
    ];
    assert.equal(distinctCircles(votes), 2);
    assert.equal(distinctCircles([]), 0);
  });

  it("identifies requiresTwoCircles by request kind", () => {
    assert.equal(
      requiresTwoCircles({ PayeePayment: { payee: "school.near", amount: "100" } }, false),
      false
    );
    assert.equal(requiresTwoCircles("VouchCancel", false), false);
    assert.equal(
      requiresTwoCircles({ LargeSpend: { to: "uncle.near", amount: "100" } }, false),
      true
    );
    assert.equal(
      requiresTwoCircles({ SetChildAccount: { child: 0, account: "ada.near" } }, false),
      true
    );
    assert.equal(requiresTwoCircles({ ChildDeceased: { child: 0 } }, false), true);
    assert.equal(requiresTwoCircles("Unpause", false), true);
    assert.equal(
      requiresTwoCircles({ PayeePayment: { payee: "school.near", amount: "100" } }, true),
      true
    );
  });

  it("rejects when 2 rejections from different circles arrive", () => {
    const req = sampleRequest({ LargeSpend: { to: "uncle.near", amount: "100" } });
    req.rejections = [
      { account: "g1.near", circle: "Maternal" },
      { account: "g2.near", circle: "Paternal" },
      { account: "g3.near", circle: "Paternal" },
    ];
    assert.equal(isRejected(req), true);

    req.rejections = [
      { account: "g1.near", circle: "Maternal" },
      { account: "g2.near", circle: "Maternal" },
    ];
    assert.equal(isRejected(req), false);
  });

  it("circleOf finds only guardians", () => {
    const trust = sampleTrust();
    assert.equal(circleOf(trust, "aunt.near"), "Maternal");
    assert.equal(circleOf(trust, "caregiver.near"), null);
    assert.equal(circleOf(trust, "stranger.near"), null);
  });
});

describe("rules: isSatisfied_matches_rust_cases", () => {
  it("payee payment needs one approval", () => {
    const trust = sampleTrust();
    const req = sampleRequest({ PayeePayment: { payee: "school.near", amount: "1000" } });
    assert.equal(isSatisfied(trust, req), false);

    req.approvals = [{ account: "pastor.near", circle: "Community" }];
    assert.equal(isSatisfied(trust, req), true);
  });

  it("large spend needs circle other than caregiver's", () => {
    const trust = sampleTrust(); // caregiver_circle = Paternal
    const req = sampleRequest({ LargeSpend: { to: "uncle.near", amount: "1000" } });

    req.approvals = [
      { account: "uncle.near", circle: "Paternal" },
      { account: "g2.near", circle: "Paternal" },
    ];
    assert.equal(isSatisfied(trust, req), false, "caregiver circle alone must not satisfy");

    req.approvals = [
      { account: "uncle.near", circle: "Paternal" },
      { account: "aunt.near", circle: "Maternal" },
    ];
    assert.equal(isSatisfied(trust, req), true);
  });

  it("flagged needs two circles", () => {
    const trust = sampleTrust();
    const req = sampleRequest({ PayeePayment: { payee: "school.near", amount: "1000" } });
    req.child_flagged = true;
    req.approvals = [{ account: "pastor.near", circle: "Community" }];
    assert.equal(isSatisfied(trust, req), false);

    req.approvals.push({ account: "teacher.near", circle: "Institution" });
    assert.equal(isSatisfied(trust, req), true);
  });

  it("set child account needs two circles", () => {
    const trust = sampleTrust();
    const req = sampleRequest({ SetChildAccount: { child: 0, account: "ada.near" } });
    req.approvals = [{ account: "aunt.near", circle: "Maternal" }];
    assert.equal(isSatisfied(trust, req), false);

    req.approvals.push({ account: "uncle.near", circle: "Maternal" });
    assert.equal(isSatisfied(trust, req), false, "two in same circle do not satisfy");

    req.approvals.push({ account: "teacher.near", circle: "Institution" });
    assert.equal(isSatisfied(trust, req), true);
  });

  it("vouch cancel needs one approval", () => {
    const trust = sampleTrust();
    const req = sampleRequest("VouchCancel");
    assert.equal(isSatisfied(trust, req), false);

    req.approvals = [{ account: "pastor.near", circle: "Community" }];
    assert.equal(isSatisfied(trust, req), true);
  });
});

describe("rules: allowanceDue_matches_rust_cases", () => {
  it("computes allowance across periods and handles arrears/balance limits", () => {
    const trust = sampleTrust();
    assert.equal(allowanceDue(trust, 0n), 0n);
    assert.equal(allowanceDue(trust, NS_PER_MONTH - 1n), 0n);
    assert.equal(allowanceDue(trust, NS_PER_MONTH), 150_000_000n);

    // Max 1 period arrears
    assert.equal(allowanceDue(trust, 5n * NS_PER_MONTH), 150_000_000n);

    // Never exceeds balance
    trust.balance = "100";
    assert.equal(allowanceDue(trust, NS_PER_MONTH), 100n);

    // Works while paused
    trust.balance = "2000000000";
    trust.paused = true;
    assert.equal(allowanceDue(trust, NS_PER_MONTH), 150_000_000n);

    // Zero before activation
    trust.status = "Funding";
    assert.equal(allowanceDue(trust, NS_PER_MONTH), 0n);
  });
});

describe("rules: remainingShare and time functions", () => {
  it("remaining share scales with spends and protects siblings", () => {
    const trust = sampleTrust();
    assert.equal(remainingShare(trust, 0), 1_000_000_000n);

    trust.balance = "1000000000";
    assert.equal(remainingShare(trust, 0), 500_000_000n);
    assert.equal(remainingShare(trust, 1), 500_000_000n);

    trust.children[1]!.alive = false;
    assert.equal(remainingShare(trust, 1), 0n);
    assert.equal(remainingShare(trust, 9), 0n);

    // First sibling paid out doesn't reduce second sibling's share
    trust.children[1]!.alive = true;
    trust.children[0]!.paid_out = "333333333";
    trust.balance = (2_000_000_000n - 333_333_333n).toString();
    assert.equal(remainingShare(trust, 0), 666_666_667n);
    assert.equal(remainingShare(trust, 1), 1_000_000_000n);

    // Fully paid child has 0 remaining
    trust.children[0]!.paid_out = "1000000000";
    trust.balance = "1000000000";
    assert.equal(remainingShare(trust, 0), 0n);
    assert.equal(remainingShare(trust, 1), 1_000_000_000n);
  });

  it("time scaling and period calculations match Rust time.rs", () => {
    assert.equal(scaled(NS_PER_MONTH, 1), NS_PER_MONTH);
    assert.equal(scaled(NS_PER_MONTH, 43_200), NS_PER_SECOND * 60n);
    assert.equal(scaled(NS_PER_DAY, 2), NS_PER_DAY / 2n);

    // periodsElapsed
    assert.equal(periodsElapsed(0n, NS_PER_MONTH * 3n, NS_PER_MONTH, 1), 3n);
    assert.equal(periodsElapsed(100n, 50n, NS_PER_MONTH, 1), 0n);
    assert.equal(periodsElapsed(0n, 100n, 0n, 1), 0n);

    // ageYears
    assert.equal(ageYears(0n, NS_PER_YEAR * 15n, 1), 15);
    assert.equal(ageYears(0n, NS_PER_YEAR * 14n - 1n, 1), 13);
  });
});
