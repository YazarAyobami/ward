// DEMO MODE ×N banner (W-7.1)
export interface DemoModeBannerProps {
  timeScale: number;
}

export function DemoModeBanner({ timeScale }: DemoModeBannerProps) {
  if (!timeScale || timeScale === 1 || timeScale <= 0) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-label="Demo mode notice"
      className="w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-200 px-3 py-1.5 text-center text-xs sm:text-sm font-medium tracking-wide flex items-center justify-center gap-2"
    >
      <span
        className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse"
        aria-hidden="true"
      />
      <span className="font-semibold">{`DEMO MODE ×${timeScale}`}</span>
      <span className="text-amber-300/80 text-[11px] sm:text-xs">
        — time accelerated for testing
      </span>
    </aside>
  );
}
