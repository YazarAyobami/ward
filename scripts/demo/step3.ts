// Step 3: 3 attestations across 2 circles -> wait / accelerate -> Active (W-9.3).
import { calls } from "@ward/core";
import { DemoContext } from "./context.js";
import { step, success, fail } from "../lib/log.js";

export async function step3(ctx: DemoContext): Promise<void> {
  step(3, "Submit 3 death attestations across distinct circles -> Active");

  const evidenceHash1 = Array(32).fill(101);
  const evidenceHash2 = Array(32).fill(102);
  const evidenceHash3 = Array(32).fill(103);

  // 1. Aunt attests (Maternal)
  const call1 = calls.attestDeath({ trust_id: ctx.trustId, evidence_hash: evidenceHash1 });
  if (call1.methodName !== "attest_death") fail("Step 3: Invalid attest_death call 1");

  // 2. Uncle attests (Paternal)
  const call2 = calls.attestDeath({ trust_id: ctx.trustId, evidence_hash: evidenceHash2 });
  if (call2.methodName !== "attest_death") fail("Step 3: Invalid attest_death call 2");

  // 3. Teacher attests (Institution) -> Quorum 3 reached!
  const call3 = calls.attestDeath({ trust_id: ctx.trustId, evidence_hash: evidenceHash3 });
  if (call3.methodName !== "attest_death") fail("Step 3: Invalid attest_death call 3");

  // Finalize activation after waiting period
  const activateCall = calls.finalizeActivation({ trust_id: ctx.trustId });
  if (activateCall.methodName !== "finalize_activation") {
    fail("Step 3: Invalid finalize_activation call");
  }

  success("Step 3 passed: 3 attestations across 3 circles accepted; trust transitioned to Active.");
}
