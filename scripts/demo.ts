// PRD §8 story end to end = acceptance test (P9). Exits non-zero on any unexpected state.
// 1 (W-9.1) create "Ada & Tobi" with aunt/uncle/teacher/pastor
// 2 (W-9.2) deposit 2,000 tUSDC (+ dry-run any-chain quote)
// 3 (W-9.3) 3 attestations → wait → Active
// 4 (W-9.4) allowance OK; uncle's 1,500 "medical" needs 2 circles; pastor rejects
// 5 (W-9.5) school fee: teacher approves → paid to school.testnet
// 6 (W-9.6) paternal-side DAO proposal to swap the teacher fails (needs 3 votes)
// 7 (W-9.7) second trust: stolen-phone withdrawal delayed, aunt + teacher veto
// 8 (W-9.8) child 14 flags; guardians set child account; at 18 graduation in 3 tranches
// 9 (W-9.9) public ledger shows the full history

import { createDemoContext } from "./demo/context.js";
import { step1 } from "./demo/step1.js";
import { step2 } from "./demo/step2.js";
import { step3 } from "./demo/step3.js";
import { step4 } from "./demo/step4.js";
import { step5 } from "./demo/step5.js";
import { step6 } from "./demo/step6.js";
import { step7 } from "./demo/step7.js";
import { step8 } from "./demo/step8.js";
import { step9 } from "./demo/step9.js";
import { log, success, fail } from "./lib/log.js";

async function main(): Promise<void> {
  const startTime = Date.now();
  log("==================================================================");
  log(" Ward End-to-End PRD §8 Acceptance Demo");
  log(" 'A children's trust on NEAR that no single relative can empty'");
  log("==================================================================");

  try {
    const ctx = await createDemoContext();

    await step1(ctx);
    await step2(ctx);
    await step3(ctx);
    await step4(ctx);
    await step5(ctx);
    await step6(ctx);
    await step7(ctx);
    await step8(ctx);
    await step9(ctx);

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    const elapsedMs = Date.now() - startTime;

    if (elapsedMs > 300_000) {
      fail(`Demo exceeded 5-minute wall clock limit (${elapsedSeconds}s)`);
    }

    log("==================================================================");
    success(`ALL 9 ACCEPTANCE STEPS PASSED IN ${elapsedSeconds}s (< 5 min requirement)`);
    log("==================================================================");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    fail(`Demo run failed with error: ${message}`);
  }
}

main().catch((err) => {
  console.error("Fatal demo error:", err);
  process.exit(1);
});
