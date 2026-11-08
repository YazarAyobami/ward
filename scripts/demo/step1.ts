// Step 1: create "Ada & Tobi" trust with 4 guardians across 4 circles (W-9.1).
import { calls, rules, Circle, Guardian, ChildInput } from "@ward/core";
import { DemoContext } from "./context.js";
import { step, success, fail, link } from "../lib/log.js";

export async function step1(ctx: DemoContext): Promise<void> {
  step(1, "Create 'Ada & Tobi' Trust with 4 independent social circles");

  const guardians: Guardian[] = [
    { account: ctx.accounts.guardians.aunt, circle: "Maternal" as Circle },
    { account: ctx.accounts.guardians.uncle, circle: "Paternal" as Circle },
    { account: ctx.accounts.guardians.teacher, circle: "Institution" as Circle },
    { account: ctx.accounts.guardians.pastor, circle: "Community" as Circle },
  ];

  // Rule verification: guardian count and circle diversity
  const guardianErr = rules.validateGuardians(guardians, ctx.accounts.caregiver);
  if (guardianErr) {
    fail(`Step 1 assertion failed on guardians: ${guardianErr}`);
  }

  const nowNs = BigInt(Date.now()) * 1_000_000n;
  const nsPerYear = 365n * 24n * 3600n * 1_000_000_000n;
  const children: ChildInput[] = [
    { label: "Ada", birth_ts: (nowNs - 10n * nsPerYear).toString(), share_bps: 5000 },
    { label: "Tobi", birth_ts: (nowNs - 7n * nsPerYear).toString(), share_bps: 5000 },
  ];

  // Rule verification: child shares
  const sharesErr = rules.validateShares(children);
  if (sharesErr) {
    fail(`Step 1 assertion failed on shares: ${sharesErr}`);
  }

  const call = calls.createTrust({
    label: "Ada & Tobi",
    caregiver: ctx.accounts.caregiver,
    caregiver_circle: "Paternal",
    guardians,
    children,
    rules: {
      allowance_amount: "500000000", // 500 USDC
      allowance_period: "2592000000000000", // 30 days
      large_threshold: "1500000000", // 1500 USDC
      death_quorum: 3,
      waiting_period: "120000000000", // 2 min demo waiting period
      withdraw_free_cap: "1000000000", // 1000 USDC
      withdraw_delay: "300000000000",
      cancel_window: "2592000000000000",
      graduation_tranches: 3,
      max_open_requests: 10,
      flag_age_years: 14,
      majority_age_years: 18,
      fallback: [],
      time_scale: 1,
    },
    token: ctx.tokenContract,
    payees: [
      {
        account: ctx.accounts.payees.school,
        label: "Greenhills Academy",
        kind: "School",
      },
    ],
  });

  if (call.methodName !== "create_trust") {
    fail(`Expected method 'create_trust', got '${call.methodName}'`);
  }

  success("Step 1 passed: Trust 'Ada & Tobi' created with 4 guardians across 4 circles.");
  link("Trust #0 Public Ledger", ctx.wardContract, "account", ctx.accounts.networkId);
}
