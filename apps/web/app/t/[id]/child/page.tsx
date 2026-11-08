"use client";

import { useState, use } from "react";
import Link from "next/link";
import { calls, formatAmount } from "@ward/core";

export interface ChildProfile {
  index: number;
  label: string;
  account: string | null;
  ageYears: number;
  shareBps: number;
  canFlag: boolean;
  canGraduate: boolean;
  remainingShare: string;
  tranchesPaid: number;
  totalTranches: number;
}

export interface ChildRequestItem {
  id: number;
  kindText: string;
  recipient: string;
  amount: string;
  reason: string;
  childFlagged: boolean;
  status: "Pending" | "Approved";
}

const DEFAULT_CHILD: ChildProfile = {
  index: 0,
  label: "Amara Osei",
  account: "amara.testnet",
  ageYears: 16,
  shareBps: 5000,
  canFlag: true,
  canGraduate: false,
  remainingShare: "25000000000",
  tranchesPaid: 0,
  totalTranches: 3,
};

const SAMPLE_CHILDREN: ChildProfile[] = [
  DEFAULT_CHILD,
  {
    index: 1,
    label: "Kofi Osei",
    account: "kofi.testnet",
    ageYears: 18,
    shareBps: 5000, // 50%
    canFlag: true,
    canGraduate: true, // >= 18
    remainingShare: "25000000000", // 25,000 USDC
    tranchesPaid: 0,
    totalTranches: 3,
  },
];

const INITIAL_REQUESTS: ChildRequestItem[] = [
  {
    id: 1,
    kindText: "Payee Payment (Tuition)",
    recipient: "st_marys_academy.testnet",
    amount: "350000000", // 350 USDC
    reason: "Term 1 secondary school tuition for Amara",
    childFlagged: false,
    status: "Pending",
  },
  {
    id: 2,
    kindText: "Large Spend (Medical)",
    recipient: "regional_hospital.testnet",
    amount: "2500000000", // 2,500 USDC
    reason: "Emergency surgical operation for Kofi following acute fracture",
    childFlagged: false,
    status: "Pending",
  },
  {
    id: 3,
    kindText: "Payee Payment (Unverified Merchant)",
    recipient: "unknown_vendor.testnet",
    amount: "800000000", // 800 USDC
    reason: "Unspecified educational supplies fee",
    childFlagged: false,
    status: "Pending",
  },
];

export function ChildView({ trustId }: { trustId: number }) {
  const [children, setChildren] = useState<ChildProfile[]>(SAMPLE_CHILDREN);
  const [selectedChildIdx, setSelectedChildIdx] = useState<number>(0);
  const [requests, setRequests] = useState<ChildRequestItem[]>(INITIAL_REQUESTS);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const activeChild: ChildProfile = children[selectedChildIdx] ?? DEFAULT_CHILD;

  // Calculate graduation tranche payout
  const remainingBigInt = BigInt(activeChild.remainingShare || "0");
  const tranchesLeft = Math.max(1, activeChild.totalTranches - activeChild.tranchesPaid);
  const nextTranchePayout = remainingBigInt / BigInt(tranchesLeft);

  // Handle Child Flagging a Request (forces 2-circle review)
  const handleFlagRequest = async (requestId: number) => {
    if (!activeChild.canFlag) {
      setFeedback({ type: "error", text: "Children under age 14 cannot exercise flag authority." });
      return;
    }

    setIsProcessing(true);
    setFeedback(null);
    try {
      const call = calls.flag({
        request_id: requestId,
        child_idx: activeChild.index,
      });

      if (!call.methodName) throw new Error("Invalid flag call");
      await new Promise((r) => setTimeout(r, 600));

      setRequests((prev) =>
        prev.map((req) => (req.id === requestId ? { ...req, childFlagged: true } : req))
      );

      setFeedback({
        type: "success",
        text: `🚩 Request #${requestId} has been flagged! 2-circle guardian consensus is now required.`,
      });
    } catch {
      setFeedback({ type: "error", text: "Failed to flag request on-chain." });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Claiming Graduation Tranche (Age >= 18)
  const handleClaimGraduation = async () => {
    if (!activeChild.canGraduate) {
      setFeedback({ type: "error", text: "Graduation tranches unlock only upon reaching majority age (18)." });
      return;
    }

    if (activeChild.tranchesPaid >= activeChild.totalTranches) {
      setFeedback({ type: "error", text: "All graduation tranches for this beneficiary have already been claimed." });
      return;
    }

    setIsProcessing(true);
    setFeedback(null);
    try {
      const call = calls.claimGraduation({
        trust_id: trustId,
        child_idx: activeChild.index,
      });

      if (!call.methodName) throw new Error("Invalid graduation call");
      await new Promise((r) => setTimeout(r, 600));

      const updatedPaid = activeChild.tranchesPaid + 1;
      const updatedRemaining = (remainingBigInt - nextTranchePayout).toString();

      setChildren((prev) =>
        prev.map((c) =>
          c.index === activeChild.index
            ? {
                ...c,
                tranchesPaid: updatedPaid,
                remainingShare: updatedRemaining,
                canGraduate: updatedPaid < c.totalTranches,
              }
            : c
        )
      );

      setFeedback({
        type: "success",
        text: `🎓 Tranche ${updatedPaid}/${activeChild.totalTranches} claimed! Dispatched ${formatAmount(
          nextTranchePayout,
          6,
          "USDC"
        )} to ${activeChild.account}.`,
      });
    } catch {
      setFeedback({ type: "error", text: "Failed to claim graduation tranche." });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Link href={`/t/${trustId}`} className="text-cyan-400 hover:underline">
                ← Trust #{trustId}
              </Link>
              <span>/</span>
              <span>Child Beneficiary Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Child Rights &amp; Graduation
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Direct beneficiary safeguards: exercise emergency expenditure flag authority and claim adult graduation tranches.
            </p>
          </div>

          {/* Child Switcher (if multiple siblings) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Viewing as:</span>
            <select
              aria-label="Select Child Beneficiary"
              value={selectedChildIdx}
              onChange={(e) => setSelectedChildIdx(parseInt(e.target.value, 10) || 0)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-cyan-500"
            >
              {children.map((c) => (
                <option key={c.index} value={c.index}>
                  {c.label} (Age {c.ageYears})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-sm ${
              feedback.type === "success"
                ? "bg-emerald-950/40 border border-emerald-800/60 text-emerald-300"
                : "bg-rose-950/40 border border-rose-800/60 text-rose-300"
            }`}
            role="status"
          >
            {feedback.text}
          </div>
        )}

        {/* Section 1: Beneficiary Overview & Legal Rights */}
        <section aria-labelledby="profile-heading" className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 id="profile-heading" className="text-lg font-semibold text-white">
                {activeChild.label}
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Wallet: {activeChild.account ?? "Pending registration"} · Allocation: {activeChild.shareBps / 100}%
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 px-3 py-1 rounded-full font-medium">
                Age {activeChild.ageYears}
              </span>
              <span
                className={`text-xs px-3 py-1 rounded-full font-medium border ${
                  activeChild.canFlag
                    ? "bg-amber-950/60 text-amber-300 border-amber-800/60"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                {activeChild.canFlag ? "Flag Rights Active (≥14)" : "Protected Minor (<14)"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <div className="text-xs text-slate-400 font-medium">Remaining Beneficiary Share</div>
              <div className="text-2xl font-bold text-white font-mono mt-1">
                {formatAmount(remainingBigInt, 6, "USDC")}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Protected on-chain balance reserved exclusively for this child.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <div className="text-xs text-slate-400 font-medium">Graduation Status</div>
              <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">
                {activeChild.tranchesPaid} / {activeChild.totalTranches} Tranches
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {activeChild.canGraduate
                  ? "Eligible for adult distribution unlocks."
                  : `Locked until 18th birthday (${18 - activeChild.ageYears} years remaining).`}
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Graduation Tranches Unlock (Age >= 18) */}
        <section aria-labelledby="graduation-heading" className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 id="graduation-heading" className="text-lg font-semibold text-white">
                Graduation Tranche Distribution
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                At age 18, the beneficiary receives their share in 3 scheduled annual tranches (1/3, 1/2, 1/1) to safeguard against sudden windfalls.
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Next Unlock Amount</div>
              <div className="text-xl font-bold text-emerald-400 font-mono">
                {activeChild.tranchesPaid < activeChild.totalTranches
                  ? formatAmount(nextTranchePayout, 6, "USDC")
                  : "0.00 USDC"}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-300 space-y-1">
              <div>
                Progress:{" "}
                <span className="font-semibold text-white">
                  Tranche {activeChild.tranchesPaid + 1} of {activeChild.totalTranches}
                </span>
              </div>
              <div>
                Target Account:{" "}
                <span className="font-mono text-cyan-300">{activeChild.account ?? "None set"}</span>
              </div>
              <div>
                Condition:{" "}
                <span className={activeChild.canGraduate ? "text-emerald-400 font-medium" : "text-amber-400"}>
                  {activeChild.canGraduate
                    ? "✓ Majority age achieved (Age ≥ 18)"
                    : `Requires age 18 (Current age: ${activeChild.ageYears})`}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClaimGraduation}
              disabled={!activeChild.canGraduate || activeChild.tranchesPaid >= activeChild.totalTranches || isProcessing}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-semibold transition ${
                !activeChild.canGraduate || activeChild.tranchesPaid >= activeChild.totalTranches
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950"
              }`}
            >
              {isProcessing
                ? "Claiming..."
                : activeChild.tranchesPaid >= activeChild.totalTranches
                ? "All Tranches Claimed"
                : activeChild.canGraduate
                ? `Claim Tranche ${activeChild.tranchesPaid + 1}`
                : "Locked until Age 18"}
            </button>
          </div>
        </section>

        {/* Section 3: Child Veto & Flagging Authority (Age >= 14) */}
        <section aria-labelledby="flag-heading" className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 space-y-4">
          <div>
            <h2 id="flag-heading" className="text-lg font-semibold text-white">
              Beneficiary Review &amp; Flag Authority (≥14 Years)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              If an expense request appears suspicious, inaccurate, or unrelated to your welfare, flag it. Flagging automatically removes single-guardian fast-track approval and forces a mandatory 2-circle multi-guardian vote.
            </p>
          </div>

          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className={`p-4 rounded-lg border transition ${
                  req.childFlagged
                    ? "bg-amber-950/20 border-amber-800/60"
                    : "bg-slate-950/60 border-slate-800/60 hover:border-slate-700"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">
                        Request #{req.id} — {req.kindText}
                      </span>
                      {req.childFlagged ? (
                        <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-600/40 px-2 py-0.5 rounded font-medium">
                          ⚠️ Flagged by Child: 2-Circle Review Enforced
                        </span>
                      ) : (
                        <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                          Standard Review
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{req.reason}</p>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Recipient: <span className="font-mono text-cyan-300">{req.recipient}</span> · Amount:{" "}
                      <span className="font-mono text-white font-semibold">
                        {formatAmount(BigInt(req.amount), 6, "USDC")}
                      </span>
                    </div>
                  </div>

                  <div>
                    {req.childFlagged ? (
                      <span className="text-xs text-amber-400 font-medium px-3 py-1.5 bg-amber-950/60 rounded border border-amber-800/50 block text-center">
                        Flagged
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleFlagRequest(req.id)}
                        disabled={!activeChild.canFlag || isProcessing}
                        className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-semibold transition ${
                          !activeChild.canFlag
                            ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                            : "bg-rose-900/60 hover:bg-rose-800/80 text-rose-200 border border-rose-700/60"
                        }`}
                      >
                        🚩 Flag as Suspicious
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function ChildPortalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const trustId = parseInt(id, 10) || 0;
  return <ChildView trustId={trustId} />;
}
