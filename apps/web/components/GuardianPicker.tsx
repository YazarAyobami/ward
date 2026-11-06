"use client";

import { rules, Circle, Guardian } from "@ward/core";
import { CircleBadge } from "./CircleBadge";

export interface GuardianItem {
  account: string;
  circle: Circle | string;
}

export interface GuardianPickerProps {
  value: GuardianItem[];
  onChange: (value: GuardianItem[]) => void;
  caregiver?: string;
  disabled?: boolean;
}

const CIRCLES: Circle[] = ["Maternal", "Paternal", "Community", "Institution"];

export function GuardianPicker({
  value,
  onChange,
  caregiver = "",
  disabled = false,
}: GuardianPickerProps) {
  // Validate guardians live using pure rules engine
  const error = rules.validateGuardians(value as Guardian[], caregiver);

  // Circle counts
  const circleCounts: Record<string, number> = {
    Maternal: 0,
    Paternal: 0,
    Community: 0,
    Institution: 0,
  };

  for (const g of value) {
    if (circleCounts[g.circle] !== undefined) {
      circleCounts[g.circle] = (circleCounts[g.circle] ?? 0) + 1;
    }
  }

  const handleAccountChange = (index: number, newAccount: string) => {
    const updated = value.map((g, i) =>
      i === index ? { ...g, account: newAccount.trim().toLowerCase() } : g
    );
    onChange(updated);
  };

  const handleCircleChange = (index: number, newCircle: string) => {
    const updated = value.map((g, i) =>
      i === index ? { ...g, circle: newCircle as Circle } : g
    );
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    if (value.length >= 5) return;
    // Default to next circle that has < 2 members
    const nextCircle = CIRCLES.find((c) => (circleCounts[c] ?? 0) < 2) ?? "Community";
    onChange([...value, { account: "", circle: nextCircle }]);
  };

  return (
    <div className="w-full space-y-4">
      {/* Header and status indicators */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
        <div>
          <h4 className="text-sm font-semibold text-neutral-200">
            Guardian Council ({value.length}/5)
          </h4>
          <p className="text-xs text-neutral-400">
            Requires 3 to 5 guardians, at most 2 per circle, across at least 2 distinct circles.
          </p>
        </div>

        {/* Live Circle Distribution */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {CIRCLES.map((c) => {
            const count = circleCounts[c] ?? 0;
            return (
              <span
                key={c}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border ${
                  count > 2
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                    : count > 0
                    ? "bg-neutral-800 text-neutral-200 border-neutral-700"
                    : "bg-neutral-900 text-neutral-500 border-neutral-800"
                }`}
                title={`${c}: ${count} guardian(s)`}
              >
                <span>{c.slice(0, 3)}:</span>
                <span className={count > 2 ? "font-bold text-rose-300" : "font-semibold"}>
                  {count}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Live validation feedback banner */}
      {error ? (
        <div
          role="alert"
          className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2"
        >
          <span className="font-bold text-amber-400">!</span>
          <span>{error}</span>
        </div>
      ) : (
        <div
          role="status"
          className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2"
        >
          <span className="font-bold text-emerald-400">✓</span>
          <span>Guardian council passes all balance and circle constraints.</span>
        </div>
      )}

      {/* Guardian list rows */}
      <div className="space-y-3">
        {value.map((guardian, index) => (
          <div
            key={index}
            className="p-3 rounded-lg bg-neutral-900/90 border border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
          >
            <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 w-6">
              #{index + 1}
            </div>

            {/* Account ID input */}
            <div className="flex-1 min-w-0">
              <input
                type="text"
                placeholder="guardian.near"
                value={guardian.account}
                disabled={disabled}
                onChange={(e) => handleAccountChange(index, e.target.value)}
                className="w-full px-3 py-1.5 text-xs sm:text-sm bg-neutral-950 border border-neutral-700 rounded text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                aria-label={`Guardian #${index + 1} account ID`}
              />
            </div>

            {/* Circle selection dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={guardian.circle}
                disabled={disabled}
                onChange={(e) => handleCircleChange(index, e.target.value)}
                className="px-2.5 py-1.5 text-xs sm:text-sm bg-neutral-950 border border-neutral-700 rounded text-neutral-200 focus:outline-none focus:border-amber-500"
                aria-label={`Guardian #${index + 1} social circle`}
              >
                {CIRCLES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <CircleBadge circle={guardian.circle} size="sm" />

              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                disabled={disabled || value.length <= 1}
                className="px-2 py-1 text-xs text-neutral-400 hover:text-rose-400 disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors"
                title="Remove guardian"
                aria-label={`Remove guardian #${index + 1}`}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Guardian button */}
      <div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled || value.length >= 5}
          className="w-full sm:w-auto px-3.5 py-1.5 text-xs font-medium rounded border border-dashed border-neutral-700 text-neutral-300 hover:text-amber-300 hover:border-amber-500/50 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
        >
          <span>+ Add Guardian</span>
          <span className="text-neutral-500">({value.length}/5)</span>
        </button>
      </div>
    </div>
  );
}
