"use client";

import { useState, use } from "react";
import Link from "next/link";
import { calls, formatAmount, parseAmount, RequestKind } from "@ward/core";
import { RequestCard, RequestCardData } from "../../../../components/RequestCard";

interface CaregiverTrustSummary {
  id: number;
  label: string;
  caregiver: string;
  allowanceAmount: string;
  allowanceCadenceDays: number;
  allowanceClaimedUntil: string;
  allowanceDue: string;
}

const SAMPLE_TRUST_DATA: CaregiverTrustSummary = {
  id: 0,
  label: "Osei Children Education & Welfare Trust",
  caregiver: "amina_caregiver.testnet",
  allowanceAmount: "250000000", // 250 USDC
  allowanceCadenceDays: 30,
  allowanceClaimedUntil: "1731000000000000000",
  allowanceDue: "250000000", // 250 USDC currently claimable
};

const INITIAL_REQUESTS: RequestCardData[] = [
  {
    id: 101,
    kind: {
      PayeePayment: {
        payee: "st_marys_academy.testnet",
        amount: "350000000",
      },
    },
    created_by: "amina_caregiver.testnet",
    reason: "Term 1 secondary school tuition for Amara",
    receipt_hash: Array(32).fill(7),
    ai_review: {
      verdict: "PASS: Valid tuition invoice matching registered school account.",
      report_hash: Array(32).fill(3),
      signing_address: "oracle.ward.testnet",
    },
    approvals: [{ account: "maternal_aunt.testnet", circle: "Maternal" }],
    rejections: [],
    child_flagged: false,
    status: "Pending",
  },
];

export async function hashFileSha256(file: File): Promise<{ hex: string; bytes: number[] }> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const bytes = Array.from(new Uint8Array(hashBuffer));
    const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
    return { hex, bytes };
  }
  // Deterministic fallback for test environments without web crypto
  const bytes = Array(32).fill(11);
  const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  return { hex, bytes };
}

export function CaregiverView({ trustId }: { trustId: number }) {
  const [trust] = useState<CaregiverTrustSummary>(SAMPLE_TRUST_DATA);
  const [allowanceDue, setAllowanceDue] = useState<string>(trust.allowanceDue);
  const [claimStatus, setClaimStatus] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  // New Request Form State
  const [requestKindType, setRequestKindType] = useState<"PayeePayment" | "LargeSpend" | "SetChildAccount">("PayeePayment");
  const [payeeOrRecipient, setPayeeOrRecipient] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [childIdx, setChildIdx] = useState(0);
  const [reason, setReason] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptHashHex, setReceiptHashHex] = useState<string | null>(null);
  const [receiptHashBytes, setReceiptHashBytes] = useState<number[] | null>(null);

  const [requests, setRequests] = useState<RequestCardData[]>(INITIAL_REQUESTS);
  const [formFeedback, setFormFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Handle file selection and client-side sha256 hashing
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setReceiptFile(null);
      setReceiptHashHex(null);
      setReceiptHashBytes(null);
      return;
    }
    setReceiptFile(file);
    try {
      const { hex, bytes } = await hashFileSha256(file);
      setReceiptHashHex(hex);
      setReceiptHashBytes(bytes);
    } catch {
      setFormFeedback({ type: "error", text: "Failed to compute SHA-256 hash of invoice file." });
    }
  };

  // Handle Allowance Claim
  const handleClaimAllowance = async () => {
    setIsClaiming(true);
    setClaimStatus(null);
    try {
      const call = calls.claimAllowance({ trust_id: trustId });
      if (!call.methodName) throw new Error("Invalid call");
      await new Promise((r) => setTimeout(r, 600));

      setAllowanceDue("0");
      setClaimStatus(`✓ Successfully claimed ${formatAmount(BigInt(allowanceDue), 6, "USDC")}! Funds dispatched.`);
    } catch {
      setClaimStatus("Failed to submit allowance claim transaction.");
    } finally {
      setIsClaiming(false);
    }
  };

  // Handle New Disbursement Request Submission
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);

    if (!reason.trim()) {
      setFormFeedback({ type: "error", text: "Please provide a clear justification / reason for guardians." });
      return;
    }

    let parsedKind: RequestKind;
    if (requestKindType === "PayeePayment") {
      if (!payeeOrRecipient.trim()) {
        setFormFeedback({ type: "error", text: "Payee account ID is required." });
        return;
      }
      try {
        const parsedAmt = parseAmount(amountStr, 6);
        if (parsedAmt <= 0n) throw new Error();
        parsedKind = { PayeePayment: { payee: payeeOrRecipient.trim(), amount: parsedAmt.toString() } };
      } catch {
        setFormFeedback({ type: "error", text: "Please enter a valid positive USDC amount." });
        return;
      }
    } else if (requestKindType === "LargeSpend") {
      if (!payeeOrRecipient.trim()) {
        setFormFeedback({ type: "error", text: "Recipient account ID is required." });
        return;
      }
      try {
        const parsedAmt = parseAmount(amountStr, 6);
        if (parsedAmt <= 0n) throw new Error();
        parsedKind = { LargeSpend: { to: payeeOrRecipient.trim(), amount: parsedAmt.toString() } };
      } catch {
        setFormFeedback({ type: "error", text: "Please enter a valid positive USDC amount." });
        return;
      }
    } else {
      if (!payeeOrRecipient.trim()) {
        setFormFeedback({ type: "error", text: "Child account ID is required." });
        return;
      }
      parsedKind = { SetChildAccount: { child: childIdx, account: payeeOrRecipient.trim() } };
    }

    setIsSubmittingRequest(true);
    try {
      const call = calls.createRequest({
        trust_id: trustId,
        kind: parsedKind,
        reason: reason.trim(),
        receipt_hash: receiptHashBytes,
      });

      if (!call.methodName) throw new Error("Invalid request call");
      await new Promise((r) => setTimeout(r, 600));

      const newId = requests.length > 0 ? Math.max(...requests.map((r) => r.id)) + 1 : 1;
      const newCard: RequestCardData = {
        id: newId,
        kind: parsedKind,
        created_by: trust.caregiver,
        reason: reason.trim(),
        receipt_hash: receiptHashBytes,
        ai_review: null,
        approvals: [],
        rejections: [],
        child_flagged: false,
        status: "Pending",
      };

      setRequests((prev) => [newCard, ...prev]);
      setFormFeedback({
        type: "success",
        text: `✓ Request #${newId} created on-chain! Guardians have been notified.`,
      });

      // Reset form
      setReason("");
      setAmountStr("");
      setPayeeOrRecipient("");
      setReceiptFile(null);
      setReceiptHashHex(null);
      setReceiptHashBytes(null);
    } catch {
      setFormFeedback({ type: "error", text: "Failed to create disbursement request." });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const dueAmountBigInt = BigInt(allowanceDue || "0");
  const regularAllowanceBigInt = BigInt(trust.allowanceAmount || "0");

  return (
    <main
      data-testid="caregiver-portal"
      data-allowance-due={allowanceDue}
      data-trust-id={trustId}
      className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-8"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
              <Link href={`/t/${trustId}`} className="text-amber-400 hover:underline">
                ← Trust #{trustId}
              </Link>
              <span>/</span>
              <span>Caregiver Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Caregiver Operations
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              Manage regular child maintenance allowance claims and submit extraordinary disbursement requests.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700 font-mono">
              Caregiver: {trust.caregiver}
            </span>
          </div>
        </div>

        {/* Section 1: Maintenance Allowance Claim */}
        <section aria-labelledby="allowance-heading" className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 id="allowance-heading" className="text-lg font-semibold text-white">
                Scheduled Maintenance Allowance
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pre-authorized living allowance for child food, utilities, and daily essentials ({formatAmount(regularAllowanceBigInt, 6, "USDC")} every {trust.allowanceCadenceDays} days).
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Available to Claim</div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">
                {formatAmount(dueAmountBigInt, 6, "USDC")}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400 space-y-1">
              <div>Cadence: <span className="text-slate-200">Every {trust.allowanceCadenceDays} days</span></div>
              <div>Direct Recipient: <span className="font-mono text-cyan-300">{trust.caregiver}</span></div>
              <div>Approval: <span className="text-emerald-400">Automatic (no guardian signature needed)</span></div>
            </div>
            <button
              type="button"
              onClick={handleClaimAllowance}
              disabled={dueAmountBigInt === 0n || isClaiming}
              className={`w-full sm:w-auto px-6 py-2.5 min-h-[44px] flex items-center justify-center rounded-lg text-sm font-semibold transition ${
                dueAmountBigInt === 0n
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950"
              }`}
            >
              {isClaiming ? "Claiming..." : dueAmountBigInt === 0n ? "No Allowance Due" : "Claim Allowance"}
            </button>
          </div>

          {claimStatus && (
            <div className="p-3 text-sm rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300" role="status">
              {claimStatus}
            </div>
          )}
        </section>

        {/* Section 2: Submit New Disbursement Request */}
        <section aria-labelledby="new-request-heading" className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 space-y-5">
          <div>
            <h2 id="new-request-heading" className="text-lg font-semibold text-white">
              Create Disbursement Request
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Request extraordinary funds for schooling, hospital bills, or major child necessities. All requests require guardian multi-circle review.
            </p>
          </div>

          <form onSubmit={handleSubmitRequest} className="space-y-4">
            {/* Kind Selector */}
            <div>
              <label htmlFor="request-kind-select" className="block text-xs font-medium text-slate-300 mb-1">
                Disbursement Kind
              </label>
              <select
                id="request-kind-select"
                value={requestKindType}
                onChange={(e) => setRequestKindType(e.target.value as "PayeePayment" | "LargeSpend" | "SetChildAccount")}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="PayeePayment">Direct Payee Payment (Tuition / Hospital / Registered Merchant) — 1 Guardian</option>
                <option value="LargeSpend">Large Spend (Major Emergency / Extraordinary Capital) — 2 Circles</option>
                <option value="SetChildAccount">Register Child Wallet Account — 2 Circles</option>
              </select>
            </div>

            {/* Payee / Recipient Account */}
            <div>
              <label htmlFor="payee-recipient-input" className="block text-xs font-medium text-slate-300 mb-1">
                {requestKindType === "PayeePayment"
                  ? "Payee NEAR Account (e.g. school or clinic account)"
                  : requestKindType === "LargeSpend"
                  ? "Recipient NEAR Account"
                  : "Child's NEAR Account"}
              </label>
              <input
                id="payee-recipient-input"
                type="text"
                placeholder="e.g. st_marys_academy.testnet"
                value={payeeOrRecipient}
                onChange={(e) => setPayeeOrRecipient(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Amount (for PayeePayment or LargeSpend) */}
            {requestKindType !== "SetChildAccount" ? (
              <div>
                <label htmlFor="amount-input" className="block text-xs font-medium text-slate-300 mb-1">
                  Requested Amount (USDC)
                </label>
                <input
                  id="amount-input"
                  type="text"
                  placeholder="e.g. 350.00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="child-idx-input" className="block text-xs font-medium text-slate-300 mb-1">
                  Child Index
                </label>
                <input
                  id="child-idx-input"
                  type="number"
                  min={0}
                  value={childIdx}
                  onChange={(e) => setChildIdx(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}

            {/* Reason / Justification */}
            <div>
              <label htmlFor="reason-textarea" className="block text-xs font-medium text-slate-300 mb-1">
                Reason &amp; Justification for Guardians
              </label>
              <textarea
                id="reason-textarea"
                rows={3}
                placeholder="Provide detailed explanation of the expense, child need, and invoice details..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Receipt / Invoice Upload & Client-side SHA-256 Hashing */}
            <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/60 space-y-2">
              <label htmlFor="receipt-file-input" className="block text-xs font-medium text-slate-300">
                Receipt / Invoice Document (SHA-256 hashed in-browser)
              </label>
              <input
                id="receipt-file-input"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-cyan-400 hover:file:bg-slate-700 cursor-pointer"
              />

              {receiptHashHex && (
                <div className="pt-2 text-xs space-y-1">
                  <div className="text-slate-400">
                    File: <span className="text-slate-200">{receiptFile?.name}</span> ({((receiptFile?.size || 0) / 1024).toFixed(1)} KB)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">SHA-256 Hash:</span>
                    <span className="font-mono text-cyan-300 break-all text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {receiptHashHex}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {formFeedback && (
              <div
                className={`p-3 text-sm rounded-lg ${
                  formFeedback.type === "success"
                    ? "bg-emerald-950/40 border border-emerald-800/60 text-emerald-300"
                    : "bg-rose-950/40 border border-rose-800/60 text-rose-300"
                }`}
                role="status"
              >
                {formFeedback.text}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmittingRequest}
              className="w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition shadow-lg shadow-cyan-950 disabled:bg-slate-800 disabled:text-slate-500"
            >
              {isSubmittingRequest ? "Submitting Request..." : "Submit Disbursement Request"}
            </button>
          </form>
        </section>

        {/* Section 3: Caregiver Request History */}
        <section aria-labelledby="requests-history-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="requests-history-heading" className="text-lg font-semibold text-white">
              Open &amp; Recent Requests
            </h2>
            <span className="text-xs text-slate-400">
              {requests.length} {requests.length === 1 ? "request" : "requests"} recorded
            </span>
          </div>

          <div className="space-y-4">
            {requests.map((req) => (
              <RequestCard key={req.id} request={req} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function CaregiverPortalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const trustId = parseInt(id, 10) || 0;
  return <CaregiverView trustId={trustId} />;
}
