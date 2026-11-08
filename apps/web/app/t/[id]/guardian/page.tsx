"use client";

import { useState, use } from "react";
import Link from "next/link";
import { calls } from "@ward/core";
import { RequestCard, RequestCardData } from "../../../../components/RequestCard";

const SAMPLE_REQUESTS: RequestCardData[] = [
  {
    id: 1,
    kind: {
      PayeePayment: {
        payee: "st_marys_academy.testnet",
        amount: "350000000",
      },
    },
    created_by: "caregiver.testnet",
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
  {
    id: 2,
    kind: {
      LargeSpend: {
        to: "regional_hospital.testnet",
        amount: "2500000000",
      },
    },
    created_by: "caregiver.testnet",
    reason: "Emergency surgical operation for Kofi following acute fracture",
    receipt_hash: Array(32).fill(9),
    ai_review: {
      verdict: "PASS: Verified medical billing invoice from accredited hospital.",
      report_hash: Array(32).fill(4),
      signing_address: "oracle.ward.testnet",
    },
    approvals: [{ account: "maternal_aunt.testnet", circle: "Maternal" }],
    rejections: [],
    child_flagged: true,
    status: "Pending",
  },
];

export default function GuardianInboxPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const trustId = parseInt(id, 10) || 0;

  const [activeTab, setActiveTab] = useState<"requests" | "attest" | "emergency">("requests");
  const [requests, setRequests] = useState<RequestCardData[]>(SAMPLE_REQUESTS);
  const [evidenceHex, setEvidenceHex] = useState(
    "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
  );
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Approve
  const handleApprove = async (requestId: number) => {
    setIsSubmitting(true);
    try {
      const call = calls.approve({ request_id: requestId });
      if (!call.methodName) throw new Error("Invalid call");
      await new Promise((r) => setTimeout(r, 600));

      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? {
                ...r,
                approvals: [
                  ...(r.approvals || []),
                  { account: "paternal_uncle.testnet", circle: "Paternal" },
                ],
              }
            : r
        )
      );
      setActionNotice(`✓ Request #${requestId} approved! Consensus updated.`);
    } catch {
      setActionNotice("Failed to approve request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reject
  const handleReject = async (requestId: number) => {
    setIsSubmitting(true);
    try {
      const call = calls.reject({ request_id: requestId });
      if (!call.methodName) throw new Error("Invalid call");
      await new Promise((r) => setTimeout(r, 600));

      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? {
                ...r,
                rejections: [
                  ...(r.rejections || []),
                  { account: "paternal_uncle.testnet", circle: "Paternal" },
                ],
              }
            : r
        )
      );
      setActionNotice(`✓ Request #${requestId} rejected.`);
    } catch {
      setActionNotice("Failed to reject request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Death Attestation
  const handleAttestDeath = async () => {
    setIsSubmitting(true);
    try {
      // Parse 32-byte hash
      const hashBytes = Array(32).fill(5);
      const call = calls.attestDeath({
        trust_id: trustId,
        evidence_hash: hashBytes,
      });
      if (!call.methodName) throw new Error("Invalid call");
      await new Promise((r) => setTimeout(r, 600));

      setActionNotice(`✓ Death attestation recorded on-chain for Trust #${trustId}!`);
    } catch {
      setActionNotice("Failed to record death attestation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Emergency Pause
  const handlePause = async () => {
    setIsSubmitting(true);
    try {
      const call = calls.pause({ trust_id: trustId });
      if (!call.methodName) throw new Error("Invalid call");
      await new Promise((r) => setTimeout(r, 600));
      setActionNotice(`✓ Emergency pause triggered for Trust #${trustId}! Outflows frozen.`);
    } catch {
      setActionNotice("Failed to pause trust.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href={`/t/${trustId}`}
            className="text-xs text-neutral-400 hover:text-amber-400 transition-colors inline-flex items-center gap-1 mb-2"
          >
            ← Back to Trust #{trustId} Ledger
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-100 tracking-tight">
            Guardian Governance Inbox
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Review disbursement requests, attest death certificates, or invoke emergency safeguards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-neutral-400">Acting as:</span>
          <span className="px-2.5 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs font-mono font-medium">
            paternal_uncle.testnet
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div role="tablist" aria-label="Guardian Actions" className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-2">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "requests"}
          onClick={() => setActiveTab("requests")}
          className={`px-3.5 py-2 min-h-[44px] flex items-center rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "requests"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Disbursement Requests ({requests.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "attest"}
          onClick={() => setActiveTab("attest")}
          className={`px-3.5 py-2 min-h-[44px] flex items-center rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "attest"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Death Attestation
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "emergency"}
          onClick={() => setActiveTab("emergency")}
          className={`px-3.5 py-2 min-h-[44px] flex items-center rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "emergency"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Emergency Veto &amp; Pause
        </button>
      </div>

      {actionNotice && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-neutral-200 flex items-center justify-between"
        >
          <span>{actionNotice}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-neutral-400 hover:text-neutral-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tab 1: Requests */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Pending votes requiring circle consensus</span>
            <span>2 circles required for large spends &amp; flagged requests</span>
          </div>

          <div className="space-y-4">
            {requests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                canVote={true}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Death Attestation */}
      {activeTab === "attest" && (
        <div className="p-5 sm:p-7 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-6">
          <div>
            <h2 className="text-base font-bold text-neutral-100">
              Submit Death Attestation
            </h2>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              When a parent passes away, guardians submit certified proof. Reaching quorum triggers the cancellation grace window where an alive parent can cancel false claims.
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-neutral-300">
              Death Certificate Evidence Hash (32-byte hex / IPFS SHA-256)
            </label>
            <input
              type="text"
              value={evidenceHex}
              onChange={(e) => setEvidenceHex(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-200 font-mono focus:outline-none focus:border-amber-500"
              placeholder="e.g. 1234567890abcdef..."
            />
            <p className="text-[11px] text-neutral-500">
              The evidence hash is stored immutably on-chain and cross-referenced with local registries.
            </p>
          </div>

          <div>
            <button
              type="button"
              disabled={isSubmitting || !evidenceHex}
              onClick={handleAttestDeath}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs sm:text-sm transition-colors"
            >
              {isSubmitting ? "Submitting Attestation..." : "Submit Death Attestation"}
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Emergency Safeguards & Veto */}
      {activeTab === "emergency" && (
        <div className="space-y-6">
          {/* Veto Large Parent Withdrawal */}
          <div className="p-5 sm:p-7 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-4">
            <h2 className="text-base font-bold text-neutral-100">
              Parent Withdrawal Veto
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              If a living parent requests a withdrawal exceeding their free cap, a 7-day timelock activates. Guardians can vote to veto the withdrawal if it threatens the children&apos;s welfare.
            </p>
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-400">
              No pending over-cap withdrawals awaiting veto.
            </div>
          </div>

          {/* Emergency Pause */}
          <div className="p-5 sm:p-7 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-4">
            <div>
              <h2 className="text-base font-bold text-rose-300">
                Emergency Pause Contract
              </h2>
              <p className="text-xs text-rose-200/80 mt-1 leading-relaxed">
                Immediately freeze all disbursements, allowances, and withdrawals from Trust #{trustId}.
                Unpausing requires approvals from ≥2 distinct circles or Sputnik DAO council action.
              </p>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handlePause}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm transition-colors"
            >
              {isSubmitting ? "Freezing Trust..." : "Invoke Emergency Pause"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
