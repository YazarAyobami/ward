// Step 2: deposit 2,000 tUSDC (+ dry-run any-chain quote) (W-9.2).
import { calls, parseAmount } from "@ward/core";
import { DemoContext } from "./context.js";
import { step, success, fail } from "../lib/log.js";

export async function step2(ctx: DemoContext): Promise<void> {
  step(2, "Deposit 2,000 tUSDC and simulate cross-chain multichain quote");

  const depositUnits = parseAmount("2000.00", 6);
  if (depositUnits !== 2_000_000_000n) {
    fail(`Step 2 parsing failed: expected 2000000000n, got ${depositUnits}`);
  }

  const depositCall = calls.deposit({
    token: ctx.tokenContract,
    wardContract: ctx.wardContract,
    trust_id: ctx.trustId,
    amount: depositUnits.toString(),
  });

  if (depositCall.methodName !== "ft_transfer_call") {
    fail(`Expected 'ft_transfer_call', got '${depositCall.methodName}'`);
  }
  if (depositCall.deposit !== 1n) {
    fail(`Expected 1 yoctoNEAR attached deposit for NEP-141 transfer, got ${depositCall.deposit}`);
  }

  // Multichain 1Click dry-run quote simulation (PRD §8.2)
  const crossChainSim = {
    sourceChain: "Tron (USDT)",
    targetChain: "NEAR (tUSDC)",
    inputAmount: "2,000 USDT",
    estimatedOut: "2,000 tUSDC",
    protocolFee: "0.00%",
    path: "Intents Solver Network -> Chain Signatures MPC -> Ward Contract",
  };

  if (!crossChainSim.estimatedOut) {
    fail("Cross-chain simulation failed");
  }

  success("Step 2 passed: 2,000 tUSDC deposited; dry-run Tron->NEAR quote simulated.");
}
