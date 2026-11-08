import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { CircleBadge } from "../components/CircleBadge";
import { DemoModeBanner } from "../components/DemoModeBanner";
import { RulesSummary } from "../components/RulesSummary";
import { Timeline, TimelineEvent } from "../components/Timeline";
import { ApprovalProgress } from "../components/ApprovalProgress";
import { RequestCard, RequestCardData } from "../components/RequestCard";
import { GuardianPicker, GuardianItem } from "../components/GuardianPicker";

describe("Web Component Test Suite (W-7.9)", () => {
  it("renders CircleBadge for all four distinct social circles", () => {
    const circles = ["Maternal", "Paternal", "Community", "Institution"] as const;
    for (const circle of circles) {
      const html = renderToString(<CircleBadge circle={circle} />);
      expect(html).toContain(circle);
    }
  });

  it("renders DemoModeBanner only when time_scale > 1", () => {
    const normalHtml = renderToString(<DemoModeBanner timeScale={1} />);
    expect(normalHtml).toBe("");

    const demoHtml = renderToString(<DemoModeBanner timeScale={3600} />);
    expect(demoHtml).toContain("DEMO MODE ×3600");
  });

  it("renders RulesSummary translating on-chain numeric parameters", () => {
    const html = renderToString(
      <RulesSummary
        rules={{
          allowance_amount: "500000000",
          allowance_period: "2592000000000000",
          large_threshold: "2000000000",
          death_quorum: 2,
          waiting_period: "1209600000000000",
          withdraw_free_cap: "1000000000",
          withdraw_delay: "604800000000000",
          cancel_window: "2592000000000000",
          graduation_tranches: 3,
          max_open_requests: 10,
          flag_age_years: 14,
          majority_age_years: 18,
          fallback: [],
          time_scale: 1,
        }}
        caregiver="caregiver.testnet"
        token="USDC"
      />
    );

    expect(html).toContain("Allowance: 500 USDC every month to caregiver.testnet");
    expect(html).toContain("caregiver.testnet");
    expect(html).toContain("at least 2 distinct guardian circles");
  });

  it("renders ApprovalProgress with multi-circle quorum bars", () => {
    const html = renderToString(
      <ApprovalProgress
        approvals={[{ account: "aunt.testnet", circle: "Maternal" }]}
        requiresTwoCircles={true}
      />
    );
    expect(html).toContain("Needs approvals from 2 distinct circles (1/2 approved)");
    expect(html).toContain("Maternal");
  });

  it("renders Timeline with chronological events and status badges", () => {
    const events: TimelineEvent[] = [
      {
        id: "evt-1",
        title: "Trust Established",
        kind: "Created",
        status: "Completed",
        timestamp: "2026-11-01",
        amount: "10,000 USDC",
        actor: "parent.testnet",
        description: "Funded with 10,000 USDC across 3 circles.",
      },
    ];

    const html = renderToString(<Timeline events={events} />);
    expect(html).toContain("Trust Established");
    expect(html).toContain("10,000 USDC");
    expect(html).toContain("parent.testnet");
  });

  it("renders RequestCard with multi-circle approval progress and AI audit panel", () => {
    const request: RequestCardData = {
      id: 42,
      kind: {
        PayeePayment: {
          payee: "clinic.testnet",
          amount: "150000000",
        },
      },
      created_by: "caregiver.testnet",
      reason: "Emergency clinic medication",
      receipt_hash: Array(32).fill(1),
      ai_review: {
        verdict: "PASS: Legitimate medical dispensary receipt.",
        report_hash: Array(32).fill(2),
        signing_address: "oracle.ward.testnet",
      },
      approvals: [{ account: "aunt.testnet", circle: "Maternal" }],
      rejections: [],
      child_flagged: false,
      status: "Pending",
    };

    const html = renderToString(<RequestCard request={request} />);
    expect(html).toContain("Direct Payee Payment");
    expect(html).toContain("Emergency clinic medication");
    expect(html).toContain("AI Oracle Review");
    expect(html).toContain("oracle.ward.testnet");
  });

  it("renders GuardianPicker with live circle diversity counter", () => {
    const validGuardians: GuardianItem[] = [
      { account: "m1.near", circle: "Maternal" },
      { account: "p1.near", circle: "Paternal" },
      { account: "c1.near", circle: "Community" },
    ];

    const html = renderToString(
      <GuardianPicker
        value={validGuardians}
        onChange={() => {}}
        caregiver="caregiver.near"
      />
    );

    expect(html).toContain("Guardian council passes all balance and circle constraints");
    expect(html).toContain("m1.near");
    expect(html).toContain("p1.near");
    expect(html).toContain("c1.near");
  });
});
