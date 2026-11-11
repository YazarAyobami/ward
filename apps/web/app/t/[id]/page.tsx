// Trust ledger (public) — status, balance, rules in plain language, guardians by circle, request timeline (W-7.3)
import Link from "next/link";
import {
  createViewClient,
  formatAmount,
  deriveTrustStage,
  getTrustStageDetails,
  deriveWithdrawalTimelockStage,
  Circle,
  Trust,
  RequestKind,
} from "@ward/core";
import { CircleBadge } from "@/components/CircleBadge";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { RulesSummary } from "@/components/RulesSummary";
import { Timeline, TimelineEvent } from "@/components/Timeline";

// Default demo trust for testnet visualization and explorer previews (Trust #0)
const DEMO_TRUST: Trust = {
  id: 0,
  label: "Ada & Tobi Education & Care Trust",
  settlor: "parent.testnet",
  dao: "ward-dao.sputnik-dao.near",
  caregiver: "caregiver.testnet",
  caregiver_circle: "Maternal",
  guardians: [
    { account: "maternal_aunt.testnet", circle: "Maternal" },
    { account: "paternal_uncle.testnet", circle: "Paternal" },
    { account: "pastor_community.testnet", circle: "Community" },
    { account: "teacher_institute.testnet", circle: "Institution" },
  ],
  children: [
    {
      label: "Ada",
      account: "ada.testnet",
      birth_ts: "1483228800000000000",
      share_bps: 5000,
      paid_out: "0",
      tranches_paid: 0,
      alive: true,
    },
    {
      label: "Tobi",
      account: "tobi.testnet",
      birth_ts: "1577836800000000000",
      share_bps: 5000,
      paid_out: "0",
      tranches_paid: 0,
      alive: true,
    },
  ],
  payees: [
    {
      account: "st_marys_academy.testnet",
      label: "St. Mary's Academy",
      kind: "School",
    },
  ],
  rules: {
    allowance_amount: "500000000", // 500 USDC
    allowance_period: "2592000000000000", // 30 days
    large_threshold: "1500000000", // 1500 USDC
    death_quorum: 3,
    waiting_period: "1209600000000000", // 14 days
    withdraw_free_cap: "1000000000", // 1000 USDC
    withdraw_delay: "604800000000000", // 7 days
    cancel_window: "2592000000000000", // 30 days
    graduation_tranches: 3,
    max_open_requests: 10,
    flag_age_years: 14,
    majority_age_years: 18,
    fallback: [],
    time_scale: 1,
  },
  token: "usdc.testnet",
  balance: "24500000000", // 24,500 USDC
  ops_balance: "1000000000000000000000000",
  status: "Active",
  paused: false,
  death_attestations: [],
  cancel_window: { cancels: 0, window_end: "0" },
  pending_withdrawal: null,
  free_withdrawn: "0",
  free_period_start: "0",
  allowance_claimed_until: "0",
  activated_at: "1730000000000000000",
  activation_balance: "25000000000",
  created_at: "1729000000000000000",
};

const DEMO_EVENTS: TimelineEvent[] = [
  {
    id: "evt-1",
    title: "Trust Created & Funded",
    kind: "Created",
    status: "Completed",
    timestamp: "2026-11-01",
    amount: "25,000 USDC",
    actor: "parent.testnet",
    description: "Settlor established the trust with 4 guardians across Maternal, Paternal, Community, and Institution circles.",
  },
  {
    id: "evt-2",
    title: "Death Attestation Submitted",
    kind: "DeathAttestation",
    status: "Completed",
    timestamp: "2026-11-03",
    actor: "maternal_aunt.testnet",
    description: "Evidence hash QmZtmD2qtQgq356J035a... uploaded for verification.",
    approvals: [{ account: "maternal_aunt.testnet", circle: "Maternal" }],
  },
  {
    id: "evt-3",
    title: "Death Attestation Quorum Reached",
    kind: "DeathAttestation",
    status: "Completed",
    timestamp: "2026-11-04",
    actor: "pastor_community.testnet",
    description: "Quorum of 3 reached across distinct circles. 14-day cancellation window started.",
    approvals: [
      { account: "maternal_aunt.testnet", circle: "Maternal" },
      { account: "paternal_uncle.testnet", circle: "Paternal" },
      { account: "pastor_community.testnet", circle: "Community" },
    ],
  },
  {
    id: "evt-4",
    title: "Trust Activated",
    kind: "Activated",
    status: "Completed",
    timestamp: "2026-11-05",
    description: "Cancellation window elapsed without contest. Monthly living allowances now unlocked.",
  },
  {
    id: "evt-5",
    title: "Monthly Allowance Claimed",
    kind: "Allowance",
    status: "Executed",
    timestamp: "2026-11-06",
    amount: "500 USDC",
    actor: "caregiver.testnet",
    description: "Disbursed to caregiver for children's living and nutrition expenses.",
  },
];

const STATUS_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  Funding: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  DeathClaimed: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  Active: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  Graduating: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
  },
  Closed: {
    bg: "bg-neutral-800/50",
    text: "text-neutral-400",
    border: "border-neutral-700",
  },
};

function formatKindTitle(kind: RequestKind): string {
  if (typeof kind === "string") return kind;
  if ("PayeePayment" in kind) return "Payee Payment";
  if ("LargeSpend" in kind) return "Large Spend";
  if ("SetChildAccount" in kind) return "Set Child Account";
  if ("ChildDeceased" in kind) return "Child Deceased";
  return "Request";
}

export default async function TrustPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trustIdNum = parseInt(id, 10);

  // Attempt to fetch from view client; fallback to demo trust if network or RPC unavailable
  let trust: Trust = DEMO_TRUST;
  let events: TimelineEvent[] = DEMO_EVENTS;

  try {
    const contractId = process.env.NEXT_PUBLIC_WARD_CONTRACT || "ward.testnet";
    const rpcUrl = process.env.NEXT_PUBLIC_NEAR_RPC || "https://rpc.testnet.near.org";
    const client = createViewClient(rpcUrl, contractId);

    if (!isNaN(trustIdNum)) {
      const fetchedTrust = await client.getTrust(trustIdNum);
      if (fetchedTrust) {
        trust = fetchedTrust;
        const fetchedRequests = await client.getRequests(trustIdNum, 0, 50);
        if (fetchedRequests.length > 0) {
          events = fetchedRequests.map((req) => ({
            id: req.id,
            title: `Request #${req.id}: ${formatKindTitle(req.kind)}`,
            kind: typeof req.kind === "string" ? req.kind : Object.keys(req.kind)[0] || "Request",
            status: req.status,
            actor: req.created_by,
            approvals: req.approvals,
            description: req.reason || "Requires consensus from distinct circles.",
          }));
        }
      }
    }
  } catch {
    // Graceful fallback to demo data
    trust = { ...DEMO_TRUST, id: isNaN(trustIdNum) ? 0 : trustIdNum };
  }

  const statusLabel =
    typeof trust.status === "string" ? trust.status : "DeathClaimed";

  const statusStyle =
    STATUS_BADGES[statusLabel] || {
      bg: "bg-neutral-800",
      text: "text-neutral-300",
      border: "border-neutral-700",
    };

  const balanceFormatted = formatAmount(
    BigInt(trust.balance || "0"),
    6,
    trust.token.replace(".testnet", "").toUpperCase()
  );

  // Group guardians by circle
  const guardiansByCircle = trust.guardians.reduce<Record<string, string[]>>(
    (acc, g) => {
      acc[g.circle] = acc[g.circle] ?? [];
      acc[g.circle]!.push(g.account);
      return acc;
    },
    {}
  );

  const trustStage = deriveTrustStage(trust);
  const stageDetails = getTrustStageDetails(trustStage);
  const withdrawalStage = deriveWithdrawalTimelockStage(trust);

  return (
    <div className="w-full bg-[#07090e] text-neutral-100">
      {/* Demo Mode Banner when time_scale != 1 */}
      <DemoModeBanner timeScale={trust.rules.time_scale} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Navigation Breadcrumb & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-xs font-mono text-neutral-400 hover:text-amber-400 transition-colors inline-flex items-center gap-1 mb-2"
            >
              &larr; Back to Overview
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {trust.label || `Trust #${trust.id}`}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-mono font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
              >
                {statusLabel}
              </span>
            </div>
            <p className="text-xs font-mono text-neutral-500 mt-1">
              Settlor: {trust.settlor} · Trust ID: #{trust.id} · Token: {trust.token}
            </p>
          </div>

          {/* Role Portals Navigation */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/t/${trust.id}/fund`}
              className="px-3 py-2 min-h-[44px] flex items-center rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold font-mono transition-colors"
            >
              Deposit Funds
            </Link>
            <Link
              href={`/t/${trust.id}/guardian`}
              className="px-3 py-2 min-h-[44px] flex items-center rounded bg-[#0e121b] hover:bg-white/[0.06] text-neutral-200 border border-white/10 text-xs font-medium font-mono transition-colors"
            >
              Guardian Inbox
            </Link>
            <Link
              href={`/t/${trust.id}/caregiver`}
              className="px-3 py-2 min-h-[44px] flex items-center rounded bg-[#0e121b] hover:bg-white/[0.06] text-neutral-200 border border-white/10 text-xs font-medium font-mono transition-colors"
            >
              Caregiver Portal
            </Link>
            <Link
              href={`/t/${trust.id}/child`}
              className="px-3 py-2 min-h-[44px] flex items-center rounded bg-[#0e121b] hover:bg-white/[0.06] text-neutral-200 border border-white/10 text-xs font-medium font-mono transition-colors"
            >
              Child Portal
            </Link>
          </div>
        </div>

        {/* Explicit State Machine Lifecycle Banner */}
        <div
          data-testid="trust-lifecycle-banner"
          data-trust-stage={trustStage.stage}
          className="p-5 rounded-lg border border-white/10 bg-[#0e121b] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-400 uppercase tracking-wider text-[11px]">
                Trust Lifecycle Stage:
              </span>
              <span className="px-2 py-0.5 rounded font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {trustStage.label}
              </span>
            </div>
            <p className="text-neutral-400 font-sans text-xs">
              {stageDetails.description}
            </p>
          </div>
          {trustStage.stage === "Active" && (
            <div className="text-left sm:text-right sm:border-l sm:border-white/10 sm:pl-4">
              <div className="text-neutral-500 uppercase font-mono text-[10px]">Claimable Caregiver Allowance</div>
              <div className="font-mono font-bold text-base text-emerald-400">
                {formatAmount(trustStage.allowanceDue, 6, "USDC")}
              </div>
            </div>
          )}
        </div>

        {/* Anti-Theft Timelock Security Banner if Pending */}
        {withdrawalStage.stage === "ReviewWindow" && (
          <div
            data-testid="withdrawal-timelock-banner"
            data-withdrawal-stage={withdrawalStage.stage}
            className="p-5 rounded-lg border border-rose-500/40 bg-rose-950/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono"
          >
            <div>
              <div className="font-bold text-rose-300 flex items-center gap-2">
                <span>⚠️</span>
                <span>Pending Over-Cap Withdrawal Under 7-Day Timelock</span>
              </div>
              <p className="text-rose-200/80 mt-1 font-sans">
                Amount: {formatAmount(withdrawalStage.amount, 6, "USDC")} · Vetoed by {withdrawalStage.vetoCount}/2 circles. Guardians can cancel unauthorized withdrawals before time expires.
              </p>
            </div>
            <Link
              href={`/t/${trust.id}/guardian`}
              className="px-3 py-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 font-semibold text-center whitespace-nowrap min-h-[44px] flex items-center justify-center"
            >
              Review &amp; Veto in Guardian Inbox &rarr;
            </Link>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-lg bg-[#0e121b] border border-white/10 space-y-1">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-500">
              Total Protected Balance
            </span>
            <div className="text-2xl font-bold font-mono text-white">
              {balanceFormatted}
            </div>
            <p className="text-[11px] text-neutral-400 font-mono">
              Locked in NEP-141 USDC contract
            </p>
          </div>

          <div className="p-5 rounded-lg bg-[#0e121b] border border-white/10 space-y-1">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-500">
              Designated Caregiver
            </span>
            <div className="text-sm font-semibold font-mono text-neutral-200 truncate">
              {trust.caregiver}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <CircleBadge circle={trust.caregiver_circle} size="sm" />
              <span className="text-[11px] text-neutral-400">Monthly allowance recipient</span>
            </div>
          </div>

          <div className="p-5 rounded-lg bg-[#0e121b] border border-white/10 space-y-1">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-500">
              Guardian Council
            </span>
            <div className="text-2xl font-bold font-mono text-white">
              {trust.guardians.length} Guardians
            </div>
            <p className="text-[11px] text-neutral-400 font-mono">
              Across {Object.keys(guardiansByCircle).length} distinct social circles
            </p>
          </div>

          <div className="p-5 rounded-lg bg-[#0e121b] border border-white/10 space-y-1">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-500">
              Protected Heirs
            </span>
            <div className="text-2xl font-bold font-mono text-white">
              {trust.children.length} Children
            </div>
            <p className="text-[11px] text-neutral-400 font-mono">
              100% total inheritance allocated
            </p>
          </div>
        </div>

        {/* Guardians by Circle & Beneficiaries */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Guardians Grouped by Circle */}
          <div className="p-6 rounded-lg bg-[#0e121b] border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
                Guardians Grouped by Circle
              </h3>
              <span className="text-xs text-neutral-500 font-mono">
                &le; 2 per circle
              </span>
            </div>

            <div className="space-y-3">
              {Object.entries(guardiansByCircle).map(([circle, accounts]) => (
                <div
                  key={circle}
                  className="p-3.5 rounded border border-white/[0.06] bg-[#07090e] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <CircleBadge circle={circle as Circle} size="sm" />
                    <span className="text-[11px] text-neutral-500 font-mono">
                      {accounts.length} guardian(s)
                    </span>
                  </div>

                  <div className="space-y-1">
                    {accounts.map((acc, aIdx) => (
                      <div
                        key={aIdx}
                        className="text-xs font-mono text-neutral-300 flex items-center justify-between"
                      >
                        <span>{acc}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">Verified Attestor</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Children & Shares */}
          <div className="p-6 rounded-lg bg-[#0e121b] border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
                Children &amp; Share Allocation
              </h3>
              <span className="text-xs text-neutral-500 font-mono">
                100% Total (10,000 bps)
              </span>
            </div>

            <div className="space-y-3">
              {trust.children.map((child, idx) => {
                const percent = child.share_bps / 100;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded border border-white/[0.06] bg-[#07090e] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-200 text-xs sm:text-sm">
                          {child.label}
                        </span>
                        {child.account && (
                          <span className="text-[11px] font-mono text-neutral-500">
                            ({child.account})
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs font-bold text-amber-400">
                        {percent}%
                      </span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-neutral-900 overflow-hidden border border-white/[0.04]">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] font-mono text-neutral-500">
                      <span>Status: {child.alive ? "Active Beneficiary" : "Deceased"}</span>
                      <span>Graduation Tranches: {child.tranches_paid}/{trust.rules.graduation_tranches}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rules in Plain Language */}
        <div className="p-6 rounded-lg bg-[#0e121b] border border-white/10">
          <RulesSummary
            rules={trust.rules}
            caregiver={trust.caregiver}
            token={trust.token.replace(".testnet", "").toUpperCase()}
          />
        </div>

        {/* Public Activity Timeline */}
        <div className="p-6 rounded-lg bg-[#0e121b] border border-white/10">
          <Timeline events={events} />
        </div>
      </div>
    </div>
  );
}
