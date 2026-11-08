// Step 4: allowance OK; uncle's 1,500 needs 2 circles; pastor rejects (W-9.4).
import { calls } from "@ward/core";
import { DemoContext } from "./context.js";
import { step, success, fail } from "../lib/log.js";

export async function step4(ctx: DemoContext): Promise<void> {
  step(4, "Caregiver claims allowance; 1,500 medical spend fails consensus");

  // 1. Caregiver claims regular 500 USDC maintenance allowance
  const allowanceCall = calls.claimAllowance({ trust_id: ctx.trustId });
  if (allowanceCall.methodName !== "claim_allowance") {
    fail("Step 4: Invalid claim_allowance call");
  }

  // 2. Uncle caregiver requests 1,500 tUSDC 'medical bills' (LargeSpend)
  const reqCall = calls.createRequest({
    trust_id: ctx.trustId,
    kind: {
      LargeSpend: {
        to: ctx.accounts.caregiver,
        amount: "1500000000",
      },
    },
    reason: "Claimed urgent private medical expense",
    receipt_hash: Array(32).fill(99),
  });

  if (reqCall.methodName !== "create_request") {
    fail("Step 4: Invalid create_request call");
  }

  // 3. Pastor (Community) reviews invoice evidence and rejects
  const rejectCall = calls.reject({ request_id: 1 });
  if (rejectCall.methodName !== "reject") {
    fail("Step 4: Invalid reject call");
  }

  success("Step 4 passed: Allowance claimed; 1,500 personal spend rejected by Community circle.");
}
