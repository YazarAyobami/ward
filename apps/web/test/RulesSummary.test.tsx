import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { RulesSummary } from "../components/RulesSummary";
import { Rules } from "@ward/core";

describe("RulesSummary", () => {
  const sampleRules: Rules = {
    allowance_amount: "150000000",
    allowance_period: (30n * 86400n * 1_000_000_000n).toString(),
    large_threshold: "2000000000",
    death_quorum: 2,
    waiting_period: (14n * 86400n * 1_000_000_000n).toString(),
    withdraw_free_cap: "1000000000",
    withdraw_delay: (7n * 86400n * 1_000_000_000n).toString(),
    cancel_window: (30n * 86400n * 1_000_000_000n).toString(),
    graduation_tranches: 3,
    max_open_requests: 10,
    flag_age_years: 14,
    majority_age_years: 18,
    fallback: [],
    time_scale: 1,
  };

  it("renders plain language allowance statement", () => {
    const html = renderToString(
      <RulesSummary
        rules={sampleRules}
        caregiver="caregiver.near"
        token="USDC"
      />
    );
    expect(html).toContain("Allowance: 150 USDC every month to caregiver.near");
    expect(html).toContain("caregiver.near");
  });

  it("renders plain language safeguards and quorum", () => {
    const html = renderToString(
      <RulesSummary rules={sampleRules} caregiver="caregiver.near" />
    );
    expect(html).toContain("at least 2 distinct guardian circles");
    expect(html).toContain("2 guardian attestations");
    expect(html).toContain("14 days waiting period");
  });

  it("renders demo mode indicator when time_scale > 1", () => {
    const html = renderToString(
      <RulesSummary
        rules={{ ...sampleRules, time_scale: 60 }}
        caregiver="caregiver.near"
      />
    );
    expect(html).toContain("Demo Mode Active");
    expect(html).toContain("60× faster");
  });
});
