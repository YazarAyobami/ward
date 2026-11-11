// Request with kind, amount, reason, AI review panel (W-7.5)
import { formatAmount } from "@ward/core";
import { ApprovalProgress, ApprovalItem } from "./ApprovalProgress";

export type RequestKindType =
  | { PayeePayment: { payee: string; amount: string } }
  | { LargeSpend: { to: string; amount: string } }
  | { SetChildAccount: { child: number; account: string } }
  | { ChildDeceased: { child: number } }
  | "Unpause"
  | "VouchCancel"
  | string;

export interface RequestCardData {
  id: number;
  kind: RequestKindType;
  created_by?: string;
  reason?: string;
  receipt_hash?: number[] | string | null;
  ai_review?: {
    verdict: string;
    report_hash: number[] | string;
    signing_address: string;
  } | null;
  approvals?: ApprovalItem[];
  rejections?: ApprovalItem[];
  child_flagged?: boolean;
  status?: "Pending" | "Approved" | "Rejected" | "Executed" | string;
  created_at?: string;
}

export interface RequestCardProps {
  request: RequestCardData;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  canVote?: boolean;
  className?: string;
}

function parseKindDetails(kind: RequestKindType): {
  title: string;
  amount?: string;
  recipient?: string;
  requiresTwoCircles: boolean;
} {
  if (typeof kind === "string") {
    if (kind === "Unpause") {
      return { title: "Unpause Contract", requiresTwoCircles: true };
    }
    if (kind === "VouchCancel") {
      return { title: "Vouch Parent Cancellation", requiresTwoCircles: false };
    }
    return { title: kind, requiresTwoCircles: false };
  }

  if ("PayeePayment" in kind) {
    const p = kind.PayeePayment;
    return {
      title: "Direct Payee Payment",
      amount: formatAmount(BigInt(p.amount || "0"), 6, "USDC"),
      recipient: p.payee,
      requiresTwoCircles: false,
    };
  }

  if ("LargeSpend" in kind) {
    const s = kind.LargeSpend;
    return {
      title: "Large Spend Request",
      amount: formatAmount(BigInt(s.amount || "0"), 6, "USDC"),
      recipient: s.to,
      requiresTwoCircles: true,
    };
  }

  if ("SetChildAccount" in kind) {
    const c = kind.SetChildAccount;
    return {
      title: `Set Child #${c.child} Account`,
      recipient: c.account,
      requiresTwoCircles: true,
    };
  }

  if ("ChildDeceased" in kind) {
    const d = kind.ChildDeceased;
    return {
      title: `Child #${d.child} Deceased Notification`,
      requiresTwoCircles: true,
    };
  }

  return { title: "Disbursement Request", requiresTwoCircles: false };
}

function formatHash(hash: number[] | string): string {
  if (typeof hash === "string") return hash;
  if (Array.isArray(hash)) {
    return Array.from(hash)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 16) + "...";
  }
  return "";
}

export function RequestCard({
  request,
  onApprove,
  onReject,
  canVote = false,
  className = "",
}: RequestCardProps) {
  const { title, amount, recipient, requiresTwoCircles } = parseKindDetails(
    request.kind
  );

  const status = request.status || "Pending";
  const approvals = request.approvals || [];
  const rejections = request.rejections || [];

  return (
    <div
      data-testid="request-card"
      data-request-id={request.id}
      data-status={status}
      data-child-flagged={Boolean(request.child_flagged)}
      className={`p-4 sm:p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4 ${className}`}
    >
      {/* Header: ID, Kind, Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-neutral-500 font-bold">
              #{request.id}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-neutral-100">
              {title}
            </h3>
            {request.child_flagged && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                🚩 CHILD FLAGGED
              </span>
            )}
          </div>
          {request.created_by && (
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Requested by <span className="font-mono text-neutral-300">{request.created_by}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {amount && (
            <span className="text-sm font-bold font-mono text-neutral-100">
              {amount}
            </span>
          )}
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              status === "Executed" || status === "Approved"
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : status === "Rejected"
                ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                : "bg-amber-500/15 text-amber-300 border-amber-500/30"
            }`}
          >
            {status}
          </span>
        </div>
      </div>

      {/* Details & Recipient */}
      <div className="text-xs space-y-2">
        {recipient && (
          <div className="flex items-center justify-between text-neutral-400">
            <span>Recipient Account:</span>
            <span className="font-mono text-neutral-200">{recipient}</span>
          </div>
        )}

        {request.reason && (
          <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300 italic">
            &ldquo;{request.reason}&rdquo;
          </div>
        )}

        {/* Receipt Verification Hash */}
        {request.receipt_hash && (
          <div className="p-2 rounded bg-neutral-950/80 border border-neutral-800 flex items-center justify-between text-[11px]">
            <span className="text-neutral-500">Receipt Evidence Hash:</span>
            <span className="font-mono text-amber-300">
              {formatHash(request.receipt_hash)}
            </span>
          </div>
        )}
      </div>

      {/* AI Review Panel (Issue #127) */}
      {request.ai_review && (
        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-purple-300 flex items-center gap-1.5">
              <span>🤖</span>
              <span>AI Oracle Review</span>
            </span>
            <span className="text-[10px] font-mono text-purple-400">
              Verified Agent
            </span>
          </div>
          <p className="text-purple-200 text-xs leading-relaxed">
            {request.ai_review.verdict}
          </p>
          <div className="text-[10px] text-purple-400/80 font-mono flex justify-between pt-1 border-t border-purple-500/20">
            <span>Signer: {request.ai_review.signing_address}</span>
            <span>Hash: {formatHash(request.ai_review.report_hash)}</span>
          </div>
        </div>
      )}

      {/* Approval & Circle Progress */}
      <div className="pt-2 border-t border-neutral-800">
        <ApprovalProgress
          approvals={approvals}
          rejections={rejections}
          requiresTwoCircles={requiresTwoCircles || Boolean(request.child_flagged)}
        />
      </div>

      {/* Voting Actions */}
      {canVote && status === "Pending" && (
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => onReject?.(request.id)}
            className="px-3.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => onApprove?.(request.id)}
            className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition-colors"
          >
            Approve Request
          </button>
        </div>
      )}
    </div>
  );
}
