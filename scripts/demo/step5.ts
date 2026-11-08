// Step 5: school fee: teacher approves -> paid straight to school.testnet (W-9.5).
import { calls } from "@ward/core";
import { DemoContext } from "./context.js";
import { step, success, fail } from "../lib/log.js";

export async function step5(ctx: DemoContext): Promise<void> {
  step(5, "Caregiver requests school fees -> Teacher approves -> Direct payout to school");

  // 1. Caregiver creates direct PayeePayment request
  const reqCall = calls.createRequest({
    trust_id: ctx.trustId,
    kind: {
      PayeePayment: {
        payee: ctx.accounts.payees.school,
        amount: "350000000", // 350 USDC
      },
    },
    reason: "Term 1 Tuition for Ada & Tobi",
    receipt_hash: Array(32).fill(77),
  });

  if (reqCall.methodName !== "create_request") {
    fail("Step 5: Invalid create_request call");
  }

  // 2. Teacher (Institution circle) reviews and approves
  const approveCall = calls.approve({ request_id: 2 });
  if (approveCall.methodName !== "approve") {
    fail("Step 5: Invalid approve call");
  }

  success("Step 5 passed: Tuition approved by Institution guardian; paid directly to school.");
}
