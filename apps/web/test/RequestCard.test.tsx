import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { RequestCard, RequestCardData } from "../components/RequestCard";

describe("RequestCard", () => {
  const sampleRequest: RequestCardData = {
    id: 42,
    kind: {
      PayeePayment: {
        payee: "st_marys_school.near",
        amount: "350000000",
      },
    },
    created_by: "caregiver.near",
    reason: "Term 1 secondary school tuition fees",
    receipt_hash: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    ai_review: {
      verdict: "PASS: Valid tuition invoice matching official school registration.",
      report_hash: [10, 20, 30, 40],
      signing_address: "oracle.ward.near",
    },
    approvals: [{ account: "maternal.near", circle: "Maternal" }],
    child_flagged: false,
    status: "Pending",
  };

  it("renders payee payment with amount, recipient, and reason", () => {
    const html = renderToString(<RequestCard request={sampleRequest} />);
    expect(html).toContain("Direct Payee Payment");
    expect(html).toContain("350 USDC");
    expect(html).toContain("st_marys_school.near");
    expect(html).toContain("Term 1 secondary school tuition fees");
  });

  it("renders receipt evidence hash and AI review panel", () => {
    const html = renderToString(<RequestCard request={sampleRequest} />);
    expect(html).toContain("Receipt Evidence Hash");
    expect(html).toContain("AI Oracle Review");
    expect(html).toContain("PASS: Valid tuition invoice matching official school registration.");
    expect(html).toContain("oracle.ward.near");
  });

  it("renders child flagged badge when child_flagged is true", () => {
    const flagged = { ...sampleRequest, child_flagged: true };
    const html = renderToString(<RequestCard request={flagged} />);
    expect(html).toContain("CHILD FLAGGED");
  });
});
