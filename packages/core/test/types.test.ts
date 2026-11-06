import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  Trust,
  Request,
  ChildStatus,
  ChildInput,
  FtMessage,
  Circle,
  RequestKind,
} from "../src/types.js";

describe("types: zod schemas", () => {
  const sampleRules = {
    allowance_amount: "500000000",
    allowance_period: "2592000000000000",
    large_threshold: "1000000000",
    death_quorum: 3,
    waiting_period: "2592000000000000",
    withdraw_free_cap: "500000000",
    withdraw_delay: "604800000000000",
    cancel_window: "1209600000000000",
    graduation_tranches: 4,
    max_open_requests: 5,
    flag_age_years: 14,
    majority_age_years: 18,
    fallback: ["relative.near"],
    time_scale: 1,
  };

  const sampleGuardians = [
    { account: "g1.near", circle: "Maternal" as const },
    { account: "g2.near", circle: "Paternal" as const },
    { account: "g3.near", circle: "Community" as const },
  ];

  const sampleChildren = [
    {
      label: "Ada",
      account: "ada.near",
      birth_ts: "1000000000000000000",
      share_bps: 6000,
      paid_out: "0",
      tranches_paid: 0,
      alive: true,
    },
    {
      label: "Tobi",
      account: null,
      birth_ts: "1200000000000000000",
      share_bps: 4000,
      paid_out: "0",
      tranches_paid: 0,
      alive: true,
    },
  ];

  const samplePayees = [
    { account: "school.near", label: "Greenwood High", kind: "School" as const },
    { account: "clinic.near", label: "St Jude Clinic", kind: "Clinic" as const },
  ];

  it("parses sample get_trust in Funding status", () => {
    const raw = {
      id: 0,
      label: "Family Trust",
      settlor: "settlor.near",
      dao: "council.sputnik-dao.near",
      caregiver: "caregiver.near",
      caregiver_circle: "Paternal",
      guardians: sampleGuardians,
      children: sampleChildren,
      payees: samplePayees,
      rules: sampleRules,
      token: "usdc.near",
      balance: "10000000000",
      ops_balance: "100000000000000000000000",
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
      created_at: "1700000000000000000",
    };

    const parsed = Trust.parse(raw);
    assert.equal(parsed.id, 0);
    assert.equal(parsed.status, "Funding");
    assert.equal(parsed.guardians.length, 3);
  });

  it("parses sample get_trust in DeathClaimed status", () => {
    const raw = {
      id: 1,
      label: "Claimed Trust",
      settlor: "settlor.near",
      dao: null,
      caregiver: "caregiver.near",
      caregiver_circle: "Maternal",
      guardians: sampleGuardians,
      children: sampleChildren,
      payees: samplePayees,
      rules: sampleRules,
      token: "usdc.near",
      balance: "5000000000",
      ops_balance: "50000000000000000000000",
      status: {
        DeathClaimed: {
          claimed_at: "1710000000000000000",
          ends_at: "1712592000000000000",
        },
      },
      paused: false,
      death_attestations: [
        {
          guardian: "g1.near",
          evidence_hash: new Array(32).fill(1),
          at: "1710000000000000000",
        },
      ],
      cancel_window: { cancels: 1, window_end: "1720000000000000000" },
      pending_withdrawal: {
        amount: "500000000",
        requested_at: "1709000000000000000",
        execute_after: "1709604800000000000",
        vetoes: [{ account: "g2.near", circle: "Paternal" }],
      },
      free_withdrawn: "100000000",
      free_period_start: "1700000000000000000",
      allowance_claimed_until: "0",
      activated_at: null,
      activation_balance: null,
      created_at: "1700000000000000000",
    };

    const parsed = Trust.parse(raw);
    assert.deepEqual(parsed.status, {
      DeathClaimed: {
        claimed_at: "1710000000000000000",
        ends_at: "1712592000000000000",
      },
    });
    assert.equal(parsed.death_attestations.length, 1);
    assert.equal(parsed.pending_withdrawal?.vetoes.length, 1);
  });

  it("parses sample get_trust in Active, Graduating, and Closed status", () => {
    for (const status of ["Active", "Graduating", "Closed"] as const) {
      const raw = {
        id: 2,
        label: "Active Trust",
        settlor: "settlor.near",
        dao: null,
        caregiver: "caregiver.near",
        caregiver_circle: "Community",
        guardians: sampleGuardians,
        children: sampleChildren,
        payees: samplePayees,
        rules: sampleRules,
        token: "usdc.near",
        balance: "8000000000",
        ops_balance: "50000000000000000000000",
        status,
        paused: false,
        death_attestations: [],
        cancel_window: null,
        pending_withdrawal: null,
        free_withdrawn: "0",
        free_period_start: "0",
        allowance_claimed_until: "1715000000000000000",
        activated_at: "1712592000000000000",
        activation_balance: "10000000000",
        created_at: "1700000000000000000",
      };

      const parsed = Trust.parse(raw);
      assert.equal(parsed.status, status);
      assert.equal(parsed.activated_at, "1712592000000000000");
    }
  });

  it("parses each variant of RequestKind in get_requests", () => {
    const kinds = [
      { PayeePayment: { payee: "school.near", amount: "500000000" } },
      { LargeSpend: { to: "specialist.near", amount: "2000000000" } },
      { SetChildAccount: { child: 1, account: "tobi.near" } },
      { ChildDeceased: { child: 1 } },
      "Unpause",
      "VouchCancel",
    ] as const;

    kinds.forEach((kind, idx) => {
      const raw = {
        id: idx,
        trust_id: 0,
        kind,
        created_by: "caregiver.near",
        reason: `Request reason #${idx}`,
        receipt_hash: idx === 0 ? new Array(32).fill(7) : null,
        ai_review:
          idx === 0
            ? {
                verdict: "Valid receipt from accredited institution",
                report_hash: new Array(32).fill(9),
                signing_address: "0x1234567890abcdef1234567890abcdef12345678",
              }
            : null,
        approvals: [{ account: "g1.near", circle: "Maternal" as const }],
        rejections: [],
        child_flagged: idx === 1,
        status: "Pending" as const,
        created_at: "1710000000000000000",
      };

      const parsed = Request.parse(raw);
      assert.equal(parsed.id, idx);
      assert.deepEqual(parsed.kind, kind);
      if (idx === 0) {
        assert.ok(parsed.ai_review);
        assert.equal(parsed.ai_review.verdict, "Valid receipt from accredited institution");
      } else {
        assert.equal(parsed.ai_review, null);
      }
    });
  });

  it("parses ChildStatus and ChildInput", () => {
    const status = ChildStatus.parse({
      age_years: 15,
      can_flag: true,
      can_graduate: false,
      remaining_share: "4500000000",
      tranches_left: 4,
    });
    assert.equal(status.age_years, 15);
    assert.equal(status.can_flag, true);
    assert.equal(status.can_graduate, false);

    const input = ChildInput.parse({
      label: "Ada",
      birth_ts: "1000000000000000000",
      share_bps: 5000,
    });
    assert.equal(input.label, "Ada");
    assert.equal(input.share_bps, 5000);
  });

  it("parses FtMessage deposit payload", () => {
    const msg = FtMessage.parse({ deposit: 42 });
    assert.equal(msg.deposit, 42);
  });

  it("rejects invalid inputs according to invariants", () => {
    // BasisPoints > 10_000
    assert.throws(() =>
      ChildInput.parse({
        label: "Invalid",
        birth_ts: "0",
        share_bps: 10_001,
      })
    );

    // Invalid Circle
    assert.throws(() => Circle.parse("UnknownCircle"));

    // Invalid U128 (contains non-digits)
    assert.throws(() =>
      RequestKind.parse({
        PayeePayment: { payee: "p.near", amount: "100NEAR" },
      })
    );

    // Invalid CryptoHash (wrong length)
    assert.throws(() =>
      Request.parse({
        id: 0,
        trust_id: 0,
        kind: "Unpause",
        created_by: "g1.near",
        reason: "unpause",
        receipt_hash: [1, 2, 3], // not 32 bytes
        ai_review: null,
        approvals: [],
        rejections: [],
        child_flagged: false,
        status: "Pending",
        created_at: "0",
      })
    );
  });
});
