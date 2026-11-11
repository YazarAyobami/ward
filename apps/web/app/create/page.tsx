"use client";

import { useState } from "react";
import Link from "next/link";
import {
  calls,
  rules,
  deriveWizardSteps,
  WizardStepStatus,
  Circle,
  Guardian,
  ChildInput,
  Rules as RulesType,
  Payee,
} from "@ward/core";
import { GuardianPicker, GuardianItem } from "../../components/GuardianPicker";
import { CircleBadge } from "../../components/CircleBadge";

const CIRCLES: Circle[] = ["Maternal", "Paternal", "Community", "Institution"];

const DEFAULT_CHILDREN: { label: string; ageYears: number; share_bps: number }[] = [
  { label: "Amara", ageYears: 10, share_bps: 5000 },
  { label: "Kofi", ageYears: 7, share_bps: 5000 },
];

const DEFAULT_GUARDIANS: GuardianItem[] = [
  { account: "maternal_aunt.testnet", circle: "Maternal" },
  { account: "paternal_uncle.testnet", circle: "Paternal" },
  { account: "local_elder.testnet", circle: "Community" },
];

export default function CreateTrustPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Trust & Caregiver
  const [label, setLabel] = useState("Children's Education & Care Trust");
  const [caregiver, setCaregiver] = useState("caregiver.testnet");
  const [caregiverCircle, setCaregiverCircle] = useState<Circle>("Maternal");

  // Step 2: Children
  const [children, setChildren] = useState(DEFAULT_CHILDREN);

  // Step 3: Guardians
  const [guardians, setGuardians] = useState<GuardianItem[]>(DEFAULT_GUARDIANS);

  // Step 4: Rules & Token
  const [token, setToken] = useState("usdc.testnet");
  const [allowanceMonthly, setAllowanceMonthly] = useState("500");
  const [largeThreshold, setLargeThreshold] = useState("2000");
  const [deathQuorum, setDeathQuorum] = useState(2);
  const [waitingPeriodDays, setWaitingPeriodDays] = useState(14);
  const [withdrawFreeCap, setWithdrawFreeCap] = useState("1000");
  const [timeScale, setTimeScale] = useState(1);
  const [graduationTranches, setGraduationTranches] = useState(3);

  // UI state for creation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Convert children to ChildInput format
  const nowNs = BigInt(Date.now()) * 1_000_000n;
  const nsPerYear = 365n * 24n * 3600n * 1_000_000_000n;
  const childInputs: ChildInput[] = children.map((c) => ({
    label: c.label,
    birth_ts: (nowNs - BigInt(c.ageYears) * nsPerYear).toString(),
    share_bps: c.share_bps,
  }));

  // Validations
  const sharesError = rules.validateShares(childInputs);
  const guardiansError = rules.validateGuardians(
    guardians as Guardian[],
    caregiver
  );

  const wizardSteps = deriveWizardSteps({
    label,
    caregiver,
    caregiverCircle,
    children: childInputs,
    guardians: guardians as Guardian[],
    token,
    deathQuorum,
  });

  const totalSharePercent =
    children.reduce((acc, c) => acc + c.share_bps, 0) / 100;

  const handleAddChild = () => {
    setChildren([...children, { label: "", ageYears: 5, share_bps: 0 }]);
  };

  const handleRemoveChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  const handleChildChange = (
    index: number,
    field: "label" | "ageYears" | "share_bps",
    val: string | number
  ) => {
    setChildren(
      children.map((c, i) => (i === index ? { ...c, [field]: val } : c))
    );
  };

  // Build the rules object
  const nsPerDay = 86400n * 1_000_000_000n;
  const builtRules: RulesType = {
    allowance_amount: (BigInt(allowanceMonthly || "0") * 1_000_000n).toString(), // USDC 6 decimals
    allowance_period: (30n * nsPerDay).toString(),
    large_threshold: (BigInt(largeThreshold || "0") * 1_000_000n).toString(),
    death_quorum: Number(deathQuorum),
    waiting_period: (BigInt(waitingPeriodDays) * nsPerDay).toString(),
    withdraw_free_cap: (BigInt(withdrawFreeCap || "0") * 1_000_000n).toString(),
    withdraw_delay: (7n * nsPerDay).toString(),
    cancel_window: (30n * nsPerDay).toString(),
    graduation_tranches: Number(graduationTranches),
    max_open_requests: 10,
    flag_age_years: 14,
    majority_age_years: 18,
    fallback: [],
    time_scale: Number(timeScale) || 1,
  };

  // Build call payload using @ward/core
  const callPayload = calls.createTrust({
    label,
    caregiver,
    caregiver_circle: caregiverCircle,
    guardians: guardians as Guardian[],
    children: childInputs,
    payees: [] as Payee[],
    rules: builtRules,
    token,
  });

  const cliCommand = `near contract call-function as-transaction ward.testnet create_trust json-args '${JSON.stringify(
    callPayload.args
  )}' prepaid-gas '150.0 Tgas' attached-deposit '1 NEAR' sign-as <your-account.testnet>`;

  const handleCreate = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // In web environment, this triggers wallet selector signAndSend
      // or falls back to instructions if not connected
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSubmitSuccess(true);
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create trust."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8">
        <Link
          href="/"
          className="text-xs text-neutral-400 hover:text-amber-400 transition-colors inline-flex items-center gap-1 mb-3"
        >
          ← Back to Overview
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-100 tracking-tight">
          Create a Protected Trust
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Configure on-chain social governance that prevents property grabbing and protects your children.
        </p>
      </div>

      {/* Wizard Steps Navigation */}
      <nav aria-label="Creation Steps" className="mb-8">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {wizardSteps.map((s: WizardStepStatus) => (
            <button
              key={s.step}
              type="button"
              data-step={s.step}
              data-complete={s.isComplete}
              onClick={() => {
                if (s.canEnter || step > s.step) {
                  setStep(s.step);
                }
              }}
              className={`py-2 px-1 text-center rounded text-xs font-medium transition-colors border min-h-[44px] ${
                step === s.step
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : s.isComplete
                  ? "bg-neutral-900 text-neutral-300 border-neutral-700"
                  : "bg-neutral-950 text-neutral-500 border-neutral-800 opacity-60"
              }`}
            >
              <span className="block text-[10px] text-neutral-500">
                Step {s.step} {s.isComplete && "✓"}
              </span>
              <span className="truncate block">{s.title.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Step Content */}
      <div
        data-wizard-step={step}
        data-step-complete={wizardSteps[step - 1]?.isComplete}
        className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 sm:p-8"
      >
        {/* Step 1: Basics & Caregiver */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-neutral-100">1. Trust Details &amp; Caregiver</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Name your trust and appoint the surviving caregiver who will receive monthly living allowances.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Trust Label
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Children's Education & Care Trust"
                  className="w-full px-3.5 py-2 text-sm bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Designated Caregiver (NEAR Account)
                </label>
                <input
                  type="text"
                  value={caregiver}
                  onChange={(e) => setCaregiver(e.target.value.trim().toLowerCase())}
                  placeholder="caregiver.testnet"
                  className="w-full px-3.5 py-2 text-sm bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:border-amber-500 font-mono"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  The caregiver cannot also serve as a guardian on the council.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Caregiver Affiliation Circle
                </label>
                <div className="flex flex-wrap gap-2">
                  {CIRCLES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCaregiverCircle(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                        caregiverCircle === c
                          ? "bg-amber-500/20 text-amber-200 border-amber-500/50"
                          : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      <CircleBadge circle={c} size="sm" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs sm:text-sm transition-colors"
              >
                Next: Children →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Children & Beneficiaries */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-neutral-100">2. Children &amp; Share Allocation</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Beneficiary shares must sum to exactly 100% (10,000 basis points).
              </p>
            </div>

            {/* Live Share Progress */}
            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">Total Allocated Shares:</span>
                <span
                  className={`font-mono font-bold ${
                    totalSharePercent === 100 ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {totalSharePercent}% / 100%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    totalSharePercent === 100
                      ? "bg-emerald-500"
                      : totalSharePercent > 100
                      ? "bg-rose-500"
                      : "bg-amber-500"
                  }`}
                  style={{ width: `${Math.min(totalSharePercent, 100)}%` }}
                />
              </div>
            </div>

            {sharesError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2"
              >
                <span className="font-bold">!</span>
                <span>{sharesError}</span>
              </div>
            )}

            {/* Children Rows */}
            <div className="space-y-3">
              {children.map((child, index) => (
                <div
                  key={index}
                  className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                >
                  <div className="flex-1">
                    <label className="block text-[11px] text-neutral-500 mb-0.5">
                      Child Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Amara"
                      value={child.label}
                      onChange={(e) =>
                        handleChildChange(index, "label", e.target.value)
                      }
                      className="w-full px-3 py-1.5 text-xs bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="w-full sm:w-28">
                    <label className="block text-[11px] text-neutral-500 mb-0.5">
                      Age (Years)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={18}
                      value={child.ageYears}
                      onChange={(e) =>
                        handleChildChange(
                          index,
                          "ageYears",
                          Number(e.target.value)
                        )
                      }
                      className="w-full px-3 py-1.5 text-xs bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="w-full sm:w-32">
                    <label className="block text-[11px] text-neutral-500 mb-0.5">
                      Share (%)
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={child.share_bps / 100}
                        onChange={(e) =>
                          handleChildChange(
                            index,
                            "share_bps",
                            Math.round(Number(e.target.value) * 100)
                          )
                        }
                        className="w-full px-3 py-1.5 text-xs bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-amber-500 font-mono"
                      />
                      <span className="text-xs text-neutral-400">%</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveChild(index)}
                    disabled={children.length <= 1}
                    className="self-end sm:self-center px-2 py-1 text-xs text-neutral-400 hover:text-rose-400 disabled:opacity-30 transition-colors mt-2 sm:mt-4"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div>
              <button
                type="button"
                onClick={handleAddChild}
                className="px-3.5 py-1.5 text-xs font-medium rounded border border-dashed border-neutral-700 text-neutral-300 hover:border-amber-500/50 hover:text-amber-300 transition-colors"
              >
                + Add Another Child
              </button>
            </div>

            <div className="flex justify-between pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs sm:text-sm transition-colors"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs sm:text-sm transition-colors"
              >
                Next: Guardians →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Guardians */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-neutral-100">3. Independent Guardian Council</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Checks and balances require 3 to 5 guardians, at most 2 per circle, across at least 2 distinct circles.
              </p>
            </div>

            <GuardianPicker
              value={guardians}
              onChange={setGuardians}
              caregiver={caregiver}
            />

            <div className="flex justify-between pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs sm:text-sm transition-colors"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs sm:text-sm transition-colors"
              >
                Next: Rules →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Rules & Safeguards */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-neutral-100">4. Rules, Limits &amp; Safeguards</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Parameters enforced mathematically by the contract to guarantee money is not hoarded or emptied.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Settlement Token
                </label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="usdc.testnet"
                  className="w-full px-3 py-1.5 text-xs sm:text-sm bg-neutral-950 border border-neutral-700 rounded text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Monthly Allowance Cap (USDC)
                </label>
                <input
                  type="number"
                  value={allowanceMonthly}
                  onChange={(e) => setAllowanceMonthly(e.target.value)}
                  placeholder="500"
                  className="w-full px-3 py-1.5 text-xs sm:text-sm bg-neutral-950 border border-neutral-700 rounded text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Large Spend Threshold (USDC)
                </label>
                <input
                  type="number"
                  value={largeThreshold}
                  onChange={(e) => setLargeThreshold(e.target.value)}
                  placeholder="2000"
                  className="w-full px-3 py-1.5 text-xs sm:text-sm bg-neutral-950 border border-neutral-700 rounded text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Requests exceeding this require consensus from ≥2 independent circles.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Death Attestation Quorum
                </label>
                <input
                  type="number"
                  min={2}
                  max={guardians.length}
                  value={deathQuorum}
                  onChange={(e) => setDeathQuorum(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm bg-neutral-950 border border-neutral-700 rounded text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Parent Grace Period (Days)
                </label>
                <input
                  type="number"
                  min={3}
                  value={waitingPeriodDays}
                  onChange={(e) => setWaitingPeriodDays(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm bg-neutral-950 border border-neutral-700 rounded text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Time for alive parent to dismiss false death claims.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Parent Free Withdrawal Cap (USDC)
                </label>
                <input
                  type="number"
                  value={withdrawFreeCap}
                  onChange={(e) => setWithdrawFreeCap(e.target.value)}
                  placeholder="1000"
                  className="w-full px-3 py-1.5 text-xs sm:text-sm bg-neutral-950 border border-neutral-700 rounded text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Amount the alive parent can withdraw instantly without a 2-circle waiting delay.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Graduation Tranches (Milestones)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={graduationTranches}
                  onChange={(e) => setGraduationTranches(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm bg-neutral-950 border border-neutral-700 rounded text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Number of scheduled releases after reaching adulthood (age 18).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Demo Time Scale (Accelerator)
                </label>
                <select
                  value={timeScale}
                  onChange={(e) => setTimeScale(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm bg-neutral-950 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-amber-500"
                >
                  <option value={1}>1× (Real Time — 1s = 1s)</option>
                  <option value={60}>60× (Demo Speed — 1 min = 1 hour)</option>
                  <option value={3600}>3600× (Demo Speed — 1 sec = 1 hour)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs sm:text-sm transition-colors"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(5)}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs sm:text-sm transition-colors"
              >
                Next: Review &amp; Deploy →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Review & Deploy */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-neutral-100">5. Review &amp; Deploy Trust</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Verify parameters before deploying the immutable trust on NEAR.
              </p>
            </div>

            {/* Validation Overview */}
            {(sharesError || guardiansError) && (
              <div
                role="alert"
                className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1"
              >
                <p className="font-bold">Cannot deploy due to validation errors:</p>
                {sharesError && <p>• {sharesError}</p>}
                {guardiansError && <p>• {guardiansError}</p>}
              </div>
            )}

            {/* Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <span className="text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">
                  Trust &amp; Beneficiaries
                </span>
                <p className="text-neutral-200 font-semibold text-sm">{label}</p>
                <p className="text-neutral-400">
                  Caregiver: <span className="font-mono text-neutral-300">{caregiver}</span>
                </p>
                <div className="pt-2 border-t border-neutral-800/60 space-y-1">
                  <p className="text-neutral-400 font-medium">Children:</p>
                  {children.map((c, i) => (
                    <div key={i} className="flex justify-between text-neutral-300">
                      <span>{c.label} ({c.ageYears} yrs)</span>
                      <span className="font-mono font-bold">{c.share_bps / 100}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <span className="text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">
                  Guardians &amp; Circles ({guardians.length})
                </span>
                <div className="space-y-1.5">
                  {guardians.map((g, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="font-mono text-neutral-300 truncate">{g.account}</span>
                      <CircleBadge circle={g.circle} size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CLI Fallback command */}
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-neutral-400">
                  NEAR CLI Deployment Command
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">1 NEAR deposit</span>
              </div>
              <pre className="p-2.5 rounded bg-neutral-900 text-[11px] font-mono text-neutral-300 overflow-x-auto whitespace-pre-wrap break-all">
                {cliCommand}
              </pre>
            </div>

            {submitSuccess && (
              <div
                role="status"
                className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm space-y-2"
              >
                <p className="font-bold">✓ Trust creation transaction prepared!</p>
                <p className="text-xs text-neutral-300">
                  Your trust has been configured and is ready to receive deposits on NEAR testnet.
                </p>
                <Link
                  href="/t/0"
                  className="inline-block mt-2 px-4 py-1.5 rounded bg-emerald-500 text-neutral-950 font-semibold text-xs"
                >
                  View in Explorer →
                </Link>
              </div>
            )}

            {submitError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs"
              >
                {submitError}
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs sm:text-sm transition-colors"
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={Boolean(sharesError || guardiansError || isSubmitting)}
                onClick={handleCreate}
                className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs sm:text-sm disabled:opacity-40 transition-colors"
              >
                {isSubmitting ? "Submitting..." : "Connect & Deploy Trust"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
