// Step 6: paternal-side DAO proposal fails (needs 3 votes, <=2 per circle) (W-9.6).
import { calls, rules, Guardian, Circle } from "@ward/core";
import { DemoContext } from "./context.js";
import { step, success, fail } from "../lib/log.js";

export async function step6(ctx: DemoContext): Promise<void> {
  step(6, "Paternal-side clan proposal to replace Teacher fails (needs 3 cross-circle votes)");

  // Attempting to stack 3 guardians in Paternal circle fails validation
  const stackedPaternal: Guardian[] = [
    { account: "paternal_uncle1.testnet", circle: "Paternal" as Circle },
    { account: "paternal_uncle2.testnet", circle: "Paternal" as Circle },
    { account: "paternal_cousin.testnet", circle: "Paternal" as Circle }, // 3rd paternal!
    { account: "maternal_aunt.testnet", circle: "Maternal" as Circle },
  ];

  const validationErr = rules.validateGuardians(stackedPaternal, ctx.accounts.caregiver);
  if (validationErr !== rules.ERRORS.E08_CIRCLE_LIMIT) {
    fail(`Expected circle limit error E08, got: ${validationErr}`);
  }

  // Contract call builder check for council_replace_guardian
  const councilCall = calls.councilReplaceGuardian({
    trust_id: ctx.trustId,
    old_guardian: ctx.accounts.guardians.teacher,
    new_guardian: "paternal_cousin.testnet",
    circle: "Paternal",
  });

  if (councilCall.methodName !== "council_replace_guardian") {
    fail("Step 6: Invalid council_replace_guardian call");
  }

  success("Step 6 passed: Paternal clan attempt to capture council blocked by 2-per-circle invariant.");
}
