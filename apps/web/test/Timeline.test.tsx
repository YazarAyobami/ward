import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { Timeline, TimelineEvent } from "../components/Timeline";

describe("Timeline", () => {
  const sampleEvents: TimelineEvent[] = [
    {
      id: "evt-1",
      title: "Trust Created & Funded",
      kind: "Created",
      status: "Completed",
      timestamp: "2026-11-01",
      amount: "10,000 USDC",
      actor: "settlor.near",
    },
    {
      id: "evt-2",
      title: "Tuition Payment to St. Mary's Academy",
      kind: "PayeePayment",
      status: "Executed",
      timestamp: "2026-11-04",
      amount: "350 USDC",
      actor: "caregiver.near",
      approvals: [{ account: "maternal_aunt.near", circle: "Maternal" }],
    },
  ];

  it("renders chronological events with titles, amounts, and statuses", () => {
    const html = renderToString(<Timeline events={sampleEvents} />);
    expect(html).toContain("Trust Created &amp; Funded");
    expect(html).toContain("Tuition Payment to St. Mary&#x27;s Academy");
    expect(html).toContain("10,000 USDC");
    expect(html).toContain("350 USDC");
    expect(html).toContain("Completed");
    expect(html).toContain("Executed");
    expect(html).toContain("Maternal");
  });

  it("renders empty state when no events are provided", () => {
    const html = renderToString(<Timeline events={[]} />);
    expect(html).toContain("No Timeline Events Yet");
  });
});
