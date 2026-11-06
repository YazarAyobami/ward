// Event timeline for the ledger (W-7.3)
import { CircleBadge } from "./CircleBadge";

export interface TimelineEvent {
  id: string | number;
  title: string;
  kind:
    | "Created"
    | "Deposit"
    | "DeathAttestation"
    | "Activated"
    | "Allowance"
    | "PayeePayment"
    | "LargeSpend"
    | "ChildFlag"
    | "Graduation"
    | string;
  status?: "Pending" | "Approved" | "Rejected" | "Executed" | "Completed" | string;
  timestamp?: string;
  actor?: string;
  amount?: string;
  description?: string;
  approvals?: { account: string; circle: string }[];
}

export interface TimelineProps {
  trustId?: number;
  events?: TimelineEvent[];
  className?: string;
}

const KIND_ICONS: Record<string, string> = {
  Created: "🌱",
  Deposit: "💰",
  DeathAttestation: "📜",
  Activated: "⚡",
  Allowance: "💵",
  PayeePayment: "🏫",
  LargeSpend: "🛡️",
  ChildFlag: "🚩",
  Graduation: "🎓",
};

const STATUS_STYLES: Record<string, string> = {
  Executed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Approved: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  Pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Rejected: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export function Timeline({
  events = [],
  className = "",
}: TimelineProps) {
  if (events.length === 0) {
    return (
      <div
        className={`p-6 rounded-xl bg-neutral-900/60 border border-neutral-800 text-center ${className}`}
      >
        <span className="text-2xl" aria-hidden="true">
          🕒
        </span>
        <h4 className="mt-2 text-sm font-semibold text-neutral-300">
          No Timeline Events Yet
        </h4>
        <p className="mt-1 text-xs text-neutral-500">
          Transactions and governance requests will appear here chronologically.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
          Public Activity Timeline ({events.length})
        </h3>
        <span className="text-[11px] text-neutral-500 font-mono">
          Immutable On-Chain History
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-800">
        {events.map((evt) => {
          const icon = KIND_ICONS[evt.kind] || "📌";
          const statusStyle =
            evt.status && STATUS_STYLES[evt.status]
              ? STATUS_STYLES[evt.status]
              : "bg-neutral-800 text-neutral-400 border-neutral-700";

          return (
            <div key={evt.id} className="relative group">
              {/* Timeline marker node */}
              <div
                className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center text-[10px] select-none"
                aria-hidden="true"
              >
                {icon}
              </div>

              {/* Event card */}
              <div className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-semibold text-neutral-100">
                      {evt.title}
                    </h4>
                    {evt.status && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle}`}
                      >
                        {evt.status}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono">
                    {evt.amount && (
                      <span className="font-bold text-neutral-200">
                        {evt.amount}
                      </span>
                    )}
                    {evt.timestamp && <span>{evt.timestamp}</span>}
                  </div>
                </div>

                {evt.description && (
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {evt.description}
                  </p>
                )}

                {/* Actor & Approvals */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800/60 text-[11px]">
                  {evt.actor && (
                    <div className="text-neutral-500">
                      By: <span className="font-mono text-neutral-300">{evt.actor}</span>
                    </div>
                  )}

                  {evt.approvals && evt.approvals.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-neutral-500 text-[10px]">Approvals:</span>
                      {evt.approvals.map((appr, aIdx) => (
                        <div key={aIdx} className="flex items-center gap-1">
                          <CircleBadge circle={appr.circle} size="sm" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
