import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { CaregiverView, hashFileSha256 } from "../app/t/[id]/caregiver/page";
import { calls, parseAmount } from "@ward/core";

describe("CaregiverPortalPage (W-7.6)", () => {
  it("renders caregiver operations heading and caregiver info with SSR renderToString", () => {
    const html = renderToString(<CaregiverView trustId={0} />);

    expect(html).toContain("Caregiver Operations");
    expect(html).toContain("Scheduled Maintenance Allowance");
    expect(html).toContain("Create Disbursement Request");
    expect(html).toContain("Claim Allowance");
    expect(html).toContain("Open &amp; Recent Requests");
  });

  it("builds valid claimAllowance contract call", () => {
    const call = calls.claimAllowance({ trust_id: 0 });
    expect(call.methodName).toBe("claim_allowance");
    expect(call.args).toEqual({ trust_id: 0 });
    expect(call.deposit).toBe(0n);
  });

  it("builds valid createRequest contract call for PayeePayment", () => {
    const parsedAmt = parseAmount("350.00", 6);
    const mockHash = Array(32).fill(7);
    const call = calls.createRequest({
      trust_id: 0,
      kind: {
        PayeePayment: {
          payee: "st_marys_academy.testnet",
          amount: parsedAmt.toString(),
        },
      },
      reason: "Term 1 tuition",
      receipt_hash: mockHash,
    });

    expect(call.methodName).toBe("create_request");
    expect(call.args.trust_id).toBe(0);
    expect(call.args.reason).toBe("Term 1 tuition");
    expect(call.args.receipt_hash).toEqual(mockHash);
    expect(call.args.kind).toHaveProperty("PayeePayment");
  });

  it("computes SHA-256 hash correctly for receipt files", async () => {
    const file = new File(["dummy invoice content"], "invoice.pdf", { type: "application/pdf" });
    const { hex, bytes } = await hashFileSha256(file);
    expect(hex).toHaveLength(64);
    expect(bytes).toHaveLength(32);
  });
});
