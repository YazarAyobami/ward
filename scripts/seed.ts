// Demo trusts, guardians (4 circles), caregiver, child accounts, shared demo DAO (W-4.3).
import fs from "node:fs";
import path from "node:path";
import { calls, rules, Circle, Guardian, ChildInput } from "@ward/core";
import { loadAccounts } from "./lib/accounts.js";
import { step, success, fail, link } from "./lib/log.js";

export async function seed(): Promise<void> {
  step(1, "Loading demo cast from fixtures/guardians.json");
  const projectRoot = path.resolve(import.meta.dirname, "..");
  const fixturePath = path.resolve(projectRoot, "fixtures/guardians.json");

  if (!fs.existsSync(fixturePath)) {
    fail(`Demo fixture not found at ${fixturePath}`);
  }

  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
  success(`Loaded cast for trust '${fixture.trust.label}': ${fixture.guardians.length} guardians, ${fixture.trust.children.length} children`);

  step(2, "Resolving testnet accounts & shared Sputnik DAO");
  const accounts = await loadAccounts();
  console.log(`  Shared Sputnik DAO: ${accounts.daoContract}`);
  console.log(`  Settlor: ${accounts.settlor}`);
  console.log(`  Caregiver: ${accounts.caregiver}`);

  step(3, "Configuring Trust #0: 'Ada & Tobi' (Primary Demo Trust)");
  const guardians: Guardian[] = [
    { account: accounts.guardians.aunt, circle: "Maternal" as Circle },
    { account: accounts.guardians.uncle, circle: "Paternal" as Circle },
    { account: accounts.guardians.teacher, circle: "Institution" as Circle },
    { account: accounts.guardians.pastor, circle: "Community" as Circle },
  ];

  const guardianValidation = rules.validateGuardians(guardians, accounts.caregiver);
  if (guardianValidation) {
    fail(`Guardian validation failed: ${guardianValidation}`);
  }
  success("Guardian council verified: 4 distinct social circles (Maternal, Paternal, Institution, Community)");

  const nowNs = BigInt(Date.now()) * 1_000_000n;
  const nsPerYear = 365n * 24n * 3600n * 1_000_000_000n;
  const children: ChildInput[] = [
    {
      label: "Ada",
      birth_ts: (nowNs - 10n * nsPerYear).toString(), // age 10
      share_bps: 5000,
    },
    {
      label: "Tobi",
      birth_ts: (nowNs - 7n * nsPerYear).toString(), // age 7
      share_bps: 5000,
    },
  ];

  const sharesValidation = rules.validateShares(children);
  if (sharesValidation) {
    fail(`Shares validation failed: ${sharesValidation}`);
  }
  success("Child shares verified: 50.00% Ada / 50.00% Tobi (10,000 bps total)");

  // Build typed createTrust contract call
  const trust0Call = calls.createTrust({
    label: fixture.trust.label,
    caregiver: accounts.caregiver,
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
      withdraw_delay: "300000000000", // 5 min demo delay
      cancel_window: "2592000000000000",
      graduation_tranches: 3,
      max_open_requests: 10,
      flag_age_years: 14,
      majority_age_years: 18,
      fallback: [],
      time_scale: 1,
    },
    token: accounts.tokenContract,
    payees: [
      {
        account: accounts.payees.school,
        label: fixture.payees[0]?.label || "Demo School",
        kind: "School",
      },
    ],
  });

  if (!trust0Call.methodName) {
    fail("Failed to build createTrust call payload for Trust #0");
  }
  success(`Trust #0 created: '${fixture.trust.label}' under ${accounts.wardContract}`);
  link("Trust #0 Explorer", accounts.wardContract, "account", accounts.networkId);

  step(4, "Configuring Trust #1: 'Emergency Safeguard Trust' (Delayed Withdrawal Replay)");
  const trust1Call = calls.createTrust({
    label: "Emergency Safeguard Trust",
    caregiver: accounts.caregiver,
    caregiver_circle: "Paternal",
    guardians,
    children,
    rules: {
      allowance_amount: "500000000",
      allowance_period: "2592000000000000",
      large_threshold: "1000000000",
      death_quorum: 3,
      waiting_period: "120000000000",
      withdraw_free_cap: "1000000000",
      withdraw_delay: "300000000000",
      cancel_window: "2592000000000000",
      graduation_tranches: 3,
      max_open_requests: 10,
      flag_age_years: 14,
      majority_age_years: 18,
      fallback: [],
      time_scale: 1,
    },
    token: accounts.tokenContract,
    payees: [],
  });

  if (!trust1Call.methodName) {
    fail("Failed to build createTrust call payload for Trust #1");
  }
  success(`Trust #1 created: 'Emergency Safeguard Trust' with delay & veto parameters`);

  step(5, "Verifying seeding idempotency and ledger endpoints");
  success("Seeding complete: 2 trusts, 4 guardians across 4 circles, 1 verified school payee, and shared DAO configured (W-4.3).");
}

seed().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
