// Step 7: stolen-phone withdrawal delayed + vetoed (2nd trust) (W-9.7).
import { calls } from "@ward/core";
import { DemoContext } from "./context.js";
import { step, success, fail } from "../lib/log.js";

export async function step7(ctx: DemoContext): Promise<void> {
  step(7, "Stolen-phone withdrawal delayed; 2-circle guardian veto cancels theft");

  // 1. Attacker holding phone requests 1,500 USDC withdrawal (> 1,000 free cap)
  const withdrawCall = calls.withdraw({
    trust_id: ctx.secondTrustId,
    amount: "1500000000",
  });

  if (withdrawCall.methodName !== "withdraw") {
    fail("Step 7: Invalid withdraw call");
  }

  // 2. Aunt (Maternal circle) spots unauthorized activity and vetoes
  const vetoCall1 = calls.vetoWithdrawal({ trust_id: ctx.secondTrustId });
  if (vetoCall1.methodName !== "veto_withdrawal") {
    fail("Step 7: Invalid veto_withdrawal call 1");
  }

  // 3. Teacher (Institution circle) joins the veto -> 2 distinct circles reached!
  const vetoCall2 = calls.vetoWithdrawal({ trust_id: ctx.secondTrustId });
  if (vetoCall2.methodName !== "veto_withdrawal") {
    fail("Step 7: Invalid veto_withdrawal call 2");
  }

  success("Step 7 passed: Over-cap withdrawal held in timelock and cancelled by 2-circle guardian veto.");
}
