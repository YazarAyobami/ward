// Rules in plain language (W-7.3)
import { Rules, formatAmount } from "@ward/core";

export interface RulesSummaryProps {
  rules: Rules;
  caregiver?: string;
  token?: string;
  decimals?: number;
  className?: string;
}

function nsToDays(nsStr: string): number {
  try {
    const ns = BigInt(nsStr);
    const nsPerDay = 86_400n * 1_000_000_000n;
    return Number(ns / nsPerDay);
  } catch {
    return 0;
  }
}

export function RulesSummary({
  rules,
  caregiver = "caregiver.near",
  token = "USDC",
  decimals = 6,
  className = "",
}: RulesSummaryProps) {
  const allowanceStr = formatAmount(BigInt(rules.allowance_amount || "0"), decimals, token);
  const largeThresholdStr = formatAmount(BigInt(rules.large_threshold || "0"), decimals, token);
  const freeCapStr = formatAmount(BigInt(rules.withdraw_free_cap || "0"), decimals, token);
  const waitingDays = nsToDays(rules.waiting_period);
  const periodDays = nsToDays(rules.allowance_period);
  const periodLabel = periodDays >= 28 && periodDays <= 31 ? "month" : `${periodDays} days`;

  const statements = [
    {
      title: "Monthly Allowance",
      text: `Allowance: ${allowanceStr} every ${periodLabel} to ${caregiver}.`,
      icon: "💵",
    },
    {
      title: "Large Spend Safeguard",
      text: `Withdrawals exceeding ${largeThresholdStr} require approvals from at least 2 distinct guardian circles.`,
      icon: "🛡️",
    },
    {
      title: "Death Quorum & Proof",
      text: `Requires ${rules.death_quorum} guardian attestations with cryptographic evidence to claim death.`,
      icon: "📜",
    },
    {
      title: "Settlor Protection Window",
      text: `${waitingDays} days waiting period allows a living parent to immediately cancel false death claims.`,
      icon: "⏳",
    },
    {
      title: "Parent Free Withdrawal",
      text: `Living parent can withdraw up to ${freeCapStr} instantly without guardian delay.`,
      icon: "🔓",
    },
    {
      title: "Child Rights & Flagging",
      text: `Children at age ${rules.flag_age_years} can flag suspicious requests; inheritance unlocks across ${rules.graduation_tranches} milestone tranches at age ${rules.majority_age_years}.`,
      icon: "🎓",
    },
  ];

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
        Trust Rules in Plain Language
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {statements.map((stmt, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 flex items-start gap-3"
          >
            <span className="text-base select-none mt-0.5" aria-hidden="true">
              {stmt.icon}
            </span>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-neutral-200">
                {stmt.title}
              </h4>
              <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
                {stmt.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      {rules.time_scale > 1 && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <span className="font-bold">⚡</span>
          <span>
            {`Demo Mode Active: Time flows ${rules.time_scale}× faster for testing.`}
          </span>
        </div>
      )}
    </div>
  );
}
