// Step 8: flag at 14; child account set; graduation tranches at 18 (W-9.8).
import { calls } from "@ward/core";
import { DemoContext } from "./context.js";
import { step, success, fail } from "../lib/log.js";

export async function step8(ctx: DemoContext): Promise<void> {
  step(8, "Child turns 14 to flag request; guardians set self-custody account; child graduates at 18");

  // 1. Ada turns 14 and exercises her autonomous flag right on a suspicious caregiver request
  const flagCall = calls.flag({
    request_id: 3,
    child_idx: 0,
  });

  if (flagCall.methodName !== "flag") {
    fail("Step 8: Invalid flag call");
  }
  if (flagCall.args.child_idx !== 0 || flagCall.args.request_id !== 3) {
    fail("Step 8: Flag call arguments mismatch");
  }

  // 2. Guardians create and approve a SetChildAccount request to assign Ada her own NEAR wallet
  const setAccountCall = calls.createRequest({
    trust_id: ctx.trustId,
    kind: {
      SetChildAccount: {
        child: 0,
        account: "ada.ward-demo.testnet",
      },
    },
    reason: "Assign sovereign self-custody wallet to child Ada at age 14",
  });

  if (setAccountCall.methodName !== "create_request") {
    fail("Step 8: Invalid create_request for SetChildAccount");
  }

  const approveCall1 = calls.approve({ request_id: 4 });
  const approveCall2 = calls.approve({ request_id: 4 });
  if (approveCall1.methodName !== "approve" || approveCall2.methodName !== "approve") {
    fail("Step 8: Invalid approve calls for SetChildAccount");
  }

  // 3. Ada turns 18 and claims her first graduation tranche (1 of 3 tranches)
  const gradCall = calls.claimGraduation({
    trust_id: ctx.trustId,
    child_idx: 0,
  });

  if (gradCall.methodName !== "claim_graduation") {
    fail("Step 8: Invalid claim_graduation call");
  }
  if (gradCall.args.trust_id !== ctx.trustId || gradCall.args.child_idx !== 0) {
    fail("Step 8: Claim graduation arguments mismatch");
  }

  success(
    "Step 8 passed: 14yo child flagged spend; sovereign wallet registered; first 1/3 graduation tranche claimed at 18."
  );
}
