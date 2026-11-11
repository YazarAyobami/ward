// Which circles have approved / what's still needed (W-7.5)
import { CircleBadge } from "./CircleBadge";

export interface ApprovalItem {
  account: string;
  circle: string;
}

export interface ApprovalProgressProps {
  approvals: ApprovalItem[];
  needed?: string;
  requiresTwoCircles?: boolean;
  rejections?: ApprovalItem[];
  className?: string;
}

const ALL_CIRCLES = ["Maternal", "Paternal", "Community", "Institution"];

export function ApprovalProgress({
  approvals,
  needed,
  requiresTwoCircles = false,
  rejections = [],
  className = "",
}: ApprovalProgressProps) {
  const approvedCircles = Array.from(new Set(approvals.map((a) => a.circle)));
  const rejectedCircles = Array.from(new Set(rejections.map((r) => r.circle)));

  const targetCircles = requiresTwoCircles ? 2 : 1;
  const currentCount = approvedCircles.length;
  const isSatisfied = currentCount >= targetCircles;
  const isRejected = rejectedCircles.length >= 2;

  const defaultNeededText = isRejected
    ? "Rejected by 2 distinct circles"
    : isSatisfied
    ? "Consensus reached"
    : requiresTwoCircles
    ? `Needs approvals from 2 distinct circles (${currentCount}/2 approved)`
    : "Needs 1 guardian approval";

  const neededText = needed || defaultNeededText;

  return (
    <div
      data-testid="approval-progress"
      data-satisfied={isSatisfied}
      data-required-circles={targetCircles}
      data-approved-circles={currentCount}
      className={`space-y-2.5 ${className}`}
    >
      {/* Progress header & status text */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
        <span className="font-semibold text-neutral-300">Circle Consensus</span>
        <span
          className={`font-mono text-[11px] font-medium ${
            isRejected
              ? "text-rose-400"
              : isSatisfied
              ? "text-emerald-400"
              : "text-amber-400"
          }`}
        >
          {neededText}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            isRejected
              ? "bg-rose-500"
              : isSatisfied
              ? "bg-emerald-500"
              : "bg-amber-500"
          }`}
          style={{
            width: isRejected
              ? "100%"
              : `${Math.min((currentCount / targetCircles) * 100, 100)}%`,
          }}
        />
      </div>

      {/* Circle Badges & Status */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {ALL_CIRCLES.map((circle) => {
          const hasApproved = approvedCircles.includes(circle);
          const hasRejected = rejectedCircles.includes(circle);

          if (hasApproved) {
            return (
              <span
                key={circle}
                className="inline-flex items-center gap-1 pl-1 pr-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px]"
              >
                <span className="font-bold">✓</span>
                <CircleBadge circle={circle} size="sm" />
              </span>
            );
          }

          if (hasRejected) {
            return (
              <span
                key={circle}
                className="inline-flex items-center gap-1 pl-1 pr-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px]"
              >
                <span className="font-bold">✕</span>
                <CircleBadge circle={circle} size="sm" />
              </span>
            );
          }

          return (
            <span
              key={circle}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-600 border border-neutral-800 text-[11px]"
              title={`${circle} (pending)`}
            >
              <span>○</span>
              <span>{circle}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
