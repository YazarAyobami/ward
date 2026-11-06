// Coloured circle label (W-7.3)
export type CircleType = "Maternal" | "Paternal" | "Community" | "Institution";

export interface CircleBadgeProps {
  circle: CircleType | string;
  size?: "sm" | "md";
  className?: string;
}

const CIRCLE_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Maternal: {
    bg: "bg-rose-500/15",
    text: "text-rose-300",
    border: "border-rose-500/30",
    dot: "bg-rose-400",
  },
  Paternal: {
    bg: "bg-sky-500/15",
    text: "text-sky-300",
    border: "border-sky-500/30",
    dot: "bg-sky-400",
  },
  Community: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-300",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  Institution: {
    bg: "bg-purple-500/15",
    text: "text-purple-300",
    border: "border-purple-500/30",
    dot: "bg-purple-400",
  },
};

const DEFAULT_STYLE = {
  bg: "bg-neutral-800",
  text: "text-neutral-300",
  border: "border-neutral-700",
  dot: "bg-neutral-400",
};

export function CircleBadge({ circle, size = "sm", className = "" }: CircleBadgeProps) {
  const style = CIRCLE_STYLES[circle] ?? DEFAULT_STYLE;
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${style.bg} ${style.text} ${style.border} ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      <span>{circle}</span>
    </span>
  );
}
