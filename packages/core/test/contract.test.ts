import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calls, createViewClient, ONE_NEAR, ONE_YOCTO, TGAS } from "../src/contract.js";
import type { Trust, Request, ChildStatus } from "../src/types.js";

function mockRpcFetch(responsePayload: unknown, ok = true, status = 200) {
  return async () => {
    if (!ok) {
      return {
        ok: false,
        status,
        statusText: "Bad Gateway",
        json: async () => ({}),
      } as Response;
    }

    const resultBytes = Array.from(Buffer.from(JSON.stringify(responsePayload), "utf8"));
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({
        jsonrpc: "2.0",
        id: "dontcare",
        result: {
          result: resultBytes,
        },
      }),
    } as Response;
  };
}

describe("contract: view client", () => {
  const sampleTrust: Trust = {
    id: 0,
    label: "Family Trust",
    settlor: "settlor.near",
    dao: null,
    caregiver: "caregiver.near",
    caregiver_circle: "Paternal",
    guardians: [{ account: "g1.near", circle: "Maternal" }],
    children: [
      {
        label: "Ada",
        account: null,
        birth_ts: "0",
        share_bps: 10000,
        paid_out: "0",
        tranches_paid: 0,
        alive: true,
      },
    ],
    payees: [],
    rules: {
      allowance_amount: "100",
      allowance_period: "1000",
      large_threshold: "500",
      death_quorum: 3,
      waiting_period: "0",
      withdraw_free_cap: "100",
      withdraw_delay: "100",
      cancel_window: "100",
      graduation_tranches: 4,
      max_open_requests: 5,
      flag_age_years: 14,
      majority_age_years: 18,
      fallback: [],
      time_scale: 1,
    },
    token: "usdc.near",
    balance: "1000",
    ops_balance: "0",
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

  it("getTrust_parses valid trust and null response", async () => {
    const clientFound = createViewClient(
      "https://rpc.testnet.near.org",
      "ward.testnet",
      mockRpcFetch(sampleTrust) as unknown as typeof fetch
    );
    const trust = await clientFound.getTrust(0);
    assert.ok(trust);
    assert.equal(trust.id, 0);
    assert.equal(trust.label, "Family Trust");

    const clientMissing = createViewClient(
      "https://rpc.testnet.near.org",
      "ward.testnet",
      mockRpcFetch(null) as unknown as typeof fetch
    );
    const notFound = await clientMissing.getTrust(99);
    assert.equal(notFound, null);
  });

  it("getTrustsFor_parses array of trusts", async () => {
    const client = createViewClient(
      "https://rpc.testnet.near.org",
      "ward.testnet",
      mockRpcFetch([sampleTrust]) as unknown as typeof fetch
    );
    const trusts = await client.getTrustsFor("settlor.near");
    assert.equal(trusts.length, 1);
    assert.equal(trusts[0]?.id, 0);
  });

  it("getRequests_parses array of requests", async () => {
    const sampleReq: Request = {
      id: 0,
      trust_id: 0,
      kind: "Unpause",
      created_by: "caregiver.near",
      reason: "Emergency unpause",
      receipt_hash: null,
      ai_review: null,
      approvals: [],
      rejections: [],
      child_flagged: false,
      status: "Pending",
      created_at: "0",
    };

    const client = createViewClient(
      "https://rpc.testnet.near.org",
      "ward.testnet",
      mockRpcFetch([sampleReq]) as unknown as typeof fetch
    );
    const requests = await client.getRequests(0);
    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.reason, "Emergency unpause");
  });

  it("getChildStatus_parses child status", async () => {
    const sampleStatus: ChildStatus = {
      age_years: 15,
      can_flag: true,
      can_graduate: false,
      remaining_share: "5000",
      tranches_left: 4,
    };

    const client = createViewClient(
      "https://rpc.testnet.near.org",
      "ward.testnet",
      mockRpcFetch(sampleStatus) as unknown as typeof fetch
    );
    const status = await client.getChildStatus(0, 0);
    assert.equal(status.age_years, 15);
    assert.equal(status.can_flag, true);
  });

  it("getAllowanceDue_parses allowance due U128 string", async () => {
    const client = createViewClient(
      "https://rpc.testnet.near.org",
      "ward.testnet",
      mockRpcFetch("150000000") as unknown as typeof fetch
    );
    const due = await client.getAllowanceDue(0);
    assert.equal(due, "150000000");
  });

  it("handles RPC errors gracefully", async () => {
    const clientFail = createViewClient(
      "https://rpc.testnet.near.org",
      "ward.testnet",
      mockRpcFetch({}, false, 502) as unknown as typeof fetch
    );
    await assert.rejects(() => clientFail.getTrust(0), /RPC HTTP error 502/);
  });
});

describe("contract: call builders", () => {
  it("builds settlor calls with correct names and arguments", () => {
    const create = calls.createTrust({
      label: "My Trust",
      caregiver: "caregiver.near",
      caregiver_circle: "Paternal",
      guardians: [{ account: "g1.near", circle: "Maternal" }],
      children: [{ label: "Ada", birth_ts: "0", share_bps: 10000 }],
      payees: [],
      rules: {
        allowance_amount: "100",
        allowance_period: "1000",
        large_threshold: "500",
        death_quorum: 3,
        waiting_period: "0",
        withdraw_free_cap: "100",
        withdraw_delay: "100",
        cancel_window: "100",
        graduation_tranches: 4,
        max_open_requests: 5,
        flag_age_years: 14,
        majority_age_years: 18,
        fallback: [],
        time_scale: 1,
      },
      token: "usdc.near",
    });
    assert.equal(create.methodName, "create_trust");
    assert.equal(create.deposit, ONE_NEAR);
    assert.equal(create.gas, 150n * TGAS);

    const addChild = calls.addChild({
      trust_id: 0,
      child: { label: "Tobi", birth_ts: "0", share_bps: 5000 },
    });
    assert.equal(addChild.methodName, "add_child");
    assert.equal(addChild.args["trust_id"], 0);

    const setDao = calls.setDao({ trust_id: 0, dao: "dao.near" });
    assert.equal(setDao.methodName, "set_dao");

    const withdraw = calls.withdraw({ trust_id: 0, amount: "500" });
    assert.equal(withdraw.methodName, "withdraw");
    assert.equal(withdraw.args["amount"], "500");

    const execWithdraw = calls.executeWithdrawal({ trust_id: 0 });
    assert.equal(execWithdraw.methodName, "execute_withdrawal");

    const cancelClaim = calls.cancelDeathClaim({ trust_id: 0 });
    assert.equal(cancelClaim.methodName, "cancel_death_claim");

    const deposit = calls.deposit({
      trust_id: 42,
      amount: "1000000",
      token: "usdc.near",
      wardContract: "ward.near",
    });
    assert.equal(deposit.contractId, "usdc.near");
    assert.equal(deposit.methodName, "ft_transfer_call");
    assert.equal(deposit.deposit, ONE_YOCTO);
    assert.deepEqual(JSON.parse(deposit.args["msg"] as string), { deposit: 42 });
  });

  it("builds guardian calls with correct names and arguments", () => {
    const hash = new Array(32).fill(7);
    const attest = calls.attestDeath({ trust_id: 1, evidence_hash: hash });
    assert.equal(attest.methodName, "attest_death");
    assert.deepEqual(attest.args["evidence_hash"], hash);

    const approve = calls.approve({ request_id: 5 });
    assert.equal(approve.methodName, "approve");
    assert.equal(approve.args["request_id"], 5);

    const reject = calls.reject({ request_id: 5 });
    assert.equal(reject.methodName, "reject");

    const veto = calls.vetoWithdrawal({ trust_id: 1 });
    assert.equal(veto.methodName, "veto_withdrawal");

    const pause = calls.pause({ trust_id: 1 });
    assert.equal(pause.methodName, "pause");

    const finalize = calls.finalizeActivation({ trust_id: 1 });
    assert.equal(finalize.methodName, "finalize_activation");
  });

  it("builds caregiver and child calls with correct names and arguments", () => {
    const claimAllowance = calls.claimAllowance({ trust_id: 2 });
    assert.equal(claimAllowance.methodName, "claim_allowance");

    const req = calls.createRequest({
      trust_id: 2,
      kind: { LargeSpend: { to: "hospital.near", amount: "5000" } },
      reason: "Emergency surgery",
      receipt_hash: null,
    });
    assert.equal(req.methodName, "create_request");
    assert.equal(req.args["reason"], "Emergency surgery");

    const flag = calls.flag({ request_id: 8, child_idx: 0 });
    assert.equal(flag.methodName, "flag");
    assert.equal(flag.args["child_idx"], 0);

    const grad = calls.claimGraduation({ trust_id: 2, child_idx: 1 });
    assert.equal(grad.methodName, "claim_graduation");
  });
});
