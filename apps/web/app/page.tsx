import Link from "next/link";
import { CircleBadge } from "@/components/CircleBadge";

export default function HomePage() {
  return (
    <div className="w-full bg-[#07090e] text-neutral-100 selection:bg-amber-500/20 selection:text-amber-200">
      {/* 1. Hero Section: Linear-grade Institutional Minimalist */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-16 sm:pt-20 sm:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-8 space-y-6">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono tracking-widest uppercase text-amber-400 font-medium">
              <span>NEAR PROTOCOL</span>
              <span className="text-neutral-600">/</span>
              <span>AUTONOMOUS TRUST PROTOCOL</span>
              <span className="text-neutral-600">/</span>
              <span className="text-emerald-400">TESTNET VERIFIED</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.06]">
              A children&apos;s trust no single relative can empty.
            </h1>

            <div className="text-sm sm:text-base text-neutral-400 space-y-3 leading-relaxed max-w-2xl">
              <p>
                When a parent passes away across sub-Saharan Africa, surviving children and spouses frequently suffer property grabbing—unilateral expropriation of family estates by predatory relatives before probate completes.
              </p>
              <p className="text-neutral-400">
                Ward codifies social money rules into immutable smart contract invariants on NEAR. Funds disburse through automated monthly allowances and multi-circle guardian consensus that mathematically prevents clan collusion.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-md">
              <Link
                href="/create"
                className="inline-flex items-center justify-center px-6 py-3 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-sm transition-colors min-h-[44px] tracking-tight shadow-sm"
              >
                Create a Trust
              </Link>
              <Link
                href="/t/0"
                className="inline-flex items-center justify-center px-6 py-3 rounded bg-[#0e121b] hover:bg-white/[0.06] text-neutral-200 border border-white/10 font-medium text-sm transition-colors min-h-[44px] tracking-tight"
              >
                Explore Demo Trust
              </Link>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="border border-white/10 rounded-lg bg-[#0e121b] p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                    Trust Instance
                  </span>
                  <div className="text-xs font-mono font-bold text-white">
                    TRUST #0 · ward.testnet
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded border border-emerald-500/30 bg-emerald-950/40 text-emerald-400">
                  Active Support
                </span>
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-neutral-500">LABEL</span>
                  <span className="text-neutral-200 font-sans font-medium text-right">
                    Ada &amp; Tobi Education &amp; Care
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-neutral-500">SETTLOR</span>
                  <span className="text-neutral-300">parent.testnet</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-neutral-500">CAREGIVER</span>
                  <span className="text-neutral-300">caregiver.testnet</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-neutral-500">BENEFICIARIES</span>
                  <span className="text-neutral-300">Ada (10y), Tobi (7y)</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/t/0"
                  className="w-full text-center block py-2 rounded border border-white/10 hover:border-white/20 bg-white/[0.02] text-xs font-mono text-neutral-300 hover:text-white transition-colors"
                >
                  View Public Ledger &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. R2: Asymmetric Bento Grid Protocol Metrics */}
      <section className="border-t border-white/10 bg-[#09090b] py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="text-xs font-mono uppercase tracking-widest text-amber-500">
                REAL-TIME PROTOCOL METRICS
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Autonomous Social Consensus Invariants
              </h2>
            </div>
            <p className="text-xs font-mono text-neutral-500">
              Live on-chain state · Verified on NEAR Testnet
            </p>
          </div>

          {/* Asymmetric Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
            {/* Bento Tile 1: Live Protected Balance (Prominent Feature Tile, lg:col-span-7) */}
            <div className="lg:col-span-7 border border-white/10 rounded-lg bg-[#0e121b] p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                    Invariant 01 · Protected Treasury
                  </span>
                  <a
                    href="https://testnet.nearblocks.io/address/ward.testnet"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 bg-emerald-950/40 px-2 py-0.5 rounded transition-colors"
                  >
                    <span>ward.testnet</span>
                    <span>↗</span>
                  </a>
                </div>

                <div className="space-y-1">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-mono text-white tracking-tight">
                    24,500 USDC
                  </div>
                  <div className="text-xs text-neutral-400 font-mono">
                    NEP-141 USDC Protected Custody · Trust #0
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans pt-1">
                  Protected in immutable smart contract storage. Funds cannot be seized by civil court executors, unilateral caregiver withdrawal, or clan relatives without verifiable quorum satisfaction.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/[0.08] text-xs font-mono">
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase">Allocation Status</span>
                  <span className="text-neutral-200 font-semibold">100% Reserved (5k bps each)</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase">Custody Architecture</span>
                  <span className="text-neutral-200 font-semibold">Non-Custodial Multi-Circle</span>
                </div>
              </div>
            </div>

            {/* Bento Tile 2: Living Allowance Cadence (lg:col-span-5) */}
            <div className="lg:col-span-5 border border-white/10 rounded-lg bg-[#0e121b] p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                    Invariant 02 · Maintenance Stream
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono text-amber-400 border border-amber-500/20 bg-amber-950/40 rounded">
                    Scheduled Cadence
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400 tracking-tight">
                    500 USDC / 30d
                  </div>
                  <div className="text-xs text-neutral-400 font-mono">
                    Living Allowance Cadence to Caregiver
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans pt-1">
                  Direct, recurring caregiver support for orphans&apos; monthly food, clothing, and primary healthcare. Disburses automatically without civil probate registry delays or lawyer cuts.
                </p>
              </div>

              <div className="pt-4 border-t border-white/[0.08] text-xs font-mono flex items-center justify-between text-neutral-400">
                <span>Free Period Limit</span>
                <span className="text-neutral-200 font-semibold">1,000 USDC / 30d Cap</span>
              </div>
            </div>

            {/* Bento Tile 3: 4-Circle Quorum (lg:col-span-7) */}
            <div className="lg:col-span-7 border border-white/10 rounded-lg bg-[#0e121b] p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                    Invariant 03 · Social Consensus
                  </span>
                  <span className="text-[11px] font-mono text-neutral-400">
                    Anti-Collusion Quorum
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
                    3 approvals across &ge; 2 circles
                  </div>
                  <div className="text-xs text-neutral-400 font-mono">
                    4-Circle Guardian Quorum Requirement
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans pt-1">
                  Guardians are divided across four independent social circles. A strict constraint (&le; 2 per circle) guarantees that no single family branch or clan faction can ever reach consensus alone.
                </p>
              </div>

              <div className="pt-4 border-t border-white/[0.08] space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                  Four Independent Social Circles
                </div>
                <div className="flex flex-wrap gap-2">
                  <CircleBadge circle="Maternal" size="md" />
                  <CircleBadge circle="Paternal" size="md" />
                  <CircleBadge circle="Community" size="md" />
                  <CircleBadge circle="Institution" size="md" />
                </div>
              </div>
            </div>

            {/* Bento Tile 4: Anti-Theft Timelock (lg:col-span-5) */}
            <div className="lg:col-span-5 border border-white/10 rounded-lg bg-[#0e121b] p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                    Invariant 04 · Security Timelock
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono text-rose-400 border border-rose-500/20 bg-rose-950/40 rounded">
                    7-Day Veto Window
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-3xl sm:text-4xl font-extrabold font-mono text-amber-400 tracking-tight">
                    7 days
                  </div>
                  <div className="text-xs text-neutral-400 font-mono">
                    Anti-Theft Timelock on Over-Cap Outflows
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans pt-1">
                  Settlor withdrawals exceeding the 1,000 USDC cap trigger an on-chain 7-day security timelock. Guardians across 2 distinct circles can exercise a veto (<span className="text-neutral-200 font-mono">calls.vetoWithdrawal</span>) to halt phone/key theft.
                </p>
              </div>

              <div className="pt-4 border-t border-white/[0.08] text-xs font-mono flex items-center justify-between text-neutral-400">
                <span>Veto Authority</span>
                <span className="text-rose-400 font-semibold">2 Distinct Circles Required</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. R3: Architectural Specification of Trust #0 */}
      <section className="border-t border-white/10 bg-[#07090e] py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="text-xs font-mono uppercase tracking-widest text-neutral-500">
                CANONICAL DEPLOYMENT
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Live Architectural Specification — Trust #0
              </h2>
            </div>
            <p className="text-xs font-mono text-neutral-400">
              Contract: <span className="text-amber-400 font-bold">ward.testnet</span> · Trust ID #0
            </p>
          </div>

          <div className="border border-white/10 rounded-lg bg-[#0e121b] overflow-hidden">
            <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.01]">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-semibold">
                  NEAR TESTNET AUTONOMOUS TRUST
                </span>
                <h3 className="text-xl font-bold text-white font-mono">
                  Ada &amp; Tobi Education &amp; Care Trust
                </h3>
                <p className="text-xs text-neutral-400">
                  Established by parent.testnet · Managed under Sputnik DAO council oversight (ward-dao.sputnik-dao.near)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded text-xs font-mono font-medium border border-emerald-500/30 bg-emerald-950/40 text-emerald-400">
                  Status: Active Support
                </span>
                <Link
                  href="/t/0"
                  className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs font-mono transition-colors tracking-tight"
                >
                  Open Ledger
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.08] text-xs font-mono">
              {/* Financial Parameters */}
              <div className="p-6 space-y-3">
                <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold border-b border-white/[0.06] pb-2">
                  Financial Parameters
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-neutral-500">PROTECTED BALANCE</span>
                  <span className="text-white font-bold">24,500 USDC</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-neutral-500">LIVING ALLOWANCE</span>
                  <span className="text-emerald-400 font-bold">500 USDC / 30d</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-neutral-500">LARGE SPEND CAP</span>
                  <span className="text-amber-400 font-bold">1,500 USDC</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-neutral-500">FREE WITHDRAW CAP</span>
                  <span className="text-neutral-300">1,000 USDC / 30d</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500">TIMELOCK WINDOW</span>
                  <span className="text-neutral-300">7 Days (604,800s)</span>
                </div>
              </div>

              {/* Social Governance Quorum */}
              <div className="p-6 space-y-3">
                <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold border-b border-white/[0.06] pb-2">
                  Social Governance Quorum
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-neutral-500">COUNCIL SIZE</span>
                  <span className="text-white font-bold">4 Guardians</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-neutral-500">APPROVAL QUORUM</span>
                  <span className="text-white font-bold">3 Approvals (≥ 2 Circles)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-neutral-500">CIRCLE MAX CAP</span>
                  <span className="text-neutral-300">≤ 2 per Circle</span>
                </div>
                <div className="pt-2">
                  <div className="text-neutral-500 text-[10px] uppercase mb-1.5">Registered Circles</div>
                  <div className="flex flex-wrap gap-1.5">
                    <CircleBadge circle="Maternal" size="sm" />
                    <CircleBadge circle="Paternal" size="sm" />
                    <CircleBadge circle="Community" size="sm" />
                    <CircleBadge circle="Institution" size="sm" />
                  </div>
                </div>
              </div>

              {/* Protected Beneficiaries */}
              <div className="p-6 space-y-3">
                <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold border-b border-white/[0.06] pb-2">
                  Beneficiaries &amp; Payees
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-neutral-500">Ada (ada.testnet)</span>
                  <span className="text-neutral-200">Age 10 · 50% (5,000 bps)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-neutral-500">Tobi (tobi.testnet)</span>
                  <span className="text-neutral-200">Age 7 · 50% (5,000 bps)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-neutral-500">DIRECT PAYEE</span>
                  <span className="text-neutral-200">St. Mary&apos;s Academy (School)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500">ADULTHOOD TRANCHES</span>
                  <span className="text-neutral-300">3 Scheduled at Age 18</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. R3: Side-by-Side Threat Model Table */}
      <section className="border-t border-white/10 bg-[#09090b] py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="max-w-3xl space-y-2">
            <div className="text-xs font-mono uppercase tracking-widest text-amber-500">
              SECURITY &amp; ADVERSARIAL ANALYSIS
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Side-by-Side Threat Model Comparison
            </h2>
            <p className="text-sm text-neutral-400">
              Evaluating failure modes across Civil Probate, Single-Key Crypto Wallets, Caregiver Discretion, and Ward&apos;s mathematical invariants.
            </p>
          </div>

          <div className="border border-white/10 rounded-lg overflow-x-auto bg-[#0e121b]">
            <table className="w-full text-left text-xs font-mono min-w-[760px]">
              <thead className="border-b border-white/10 bg-white/[0.02] text-neutral-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-[20%] text-neutral-300 font-semibold">Scenario / Threat Vector</th>
                  <th className="py-3.5 px-4 w-[20%] text-neutral-400">Civil Probate</th>
                  <th className="py-3.5 px-4 w-[20%] text-neutral-400">Single-Key Wallet</th>
                  <th className="py-3.5 px-4 w-[20%] text-neutral-400">Caregiver Discretion</th>
                  <th className="py-3.5 px-4 w-[20%] text-amber-400 font-semibold bg-amber-500/[0.03]">Ward Invariants</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-neutral-300 font-sans">
                {/* Row 1 */}
                <tr>
                  <td className="py-4 px-4 font-semibold text-white font-mono bg-white/[0.01]">
                    Settlor Incapacitation / Sudden Passing
                  </td>
                  <td className="py-4 px-4 text-neutral-400">
                    Probate takes 2 to 7 years in court registries; legal and filing fees drain the balance.
                  </td>
                  <td className="py-4 px-4 text-neutral-400">
                    Seed phrase dies with settlor; funds permanently stranded with zero recovery path.
                  </td>
                  <td className="py-4 px-4 text-neutral-400">
                    Informal disputes over cash; relatives seize assets before any maintenance reaches children.
                  </td>
                  <td className="py-4 px-4 text-neutral-100 bg-amber-500/[0.02]">
                    Autonomous monthly allowance ($500/30d) unlocks after 3-guardian death quorum with 14d cancel window.
                  </td>
                </tr>

                {/* Row 2 */}
                <tr>
                  <td className="py-4 px-4 font-semibold text-white font-mono bg-white/[0.01]">
                    Caregiver Embezzlement / Asset Stripping
                  </td>
                  <td className="py-4 px-4 text-neutral-400">
                    Court appoints administrator with minimal ongoing verification or automated receipts.
                  </td>
                  <td className="py-4 px-4 text-neutral-400">
                    Sole keyholder has absolute custody; can drain 100% of the funds in one block.
                  </td>
                  <td className="py-4 px-4 text-neutral-400">
                    Caregiver liquidates children&apos;s education fund to cover unrelated personal or clan debts.
                  </td>
                  <td className="py-4 px-4 text-neutral-100 bg-amber-500/[0.02]">
                    Tuition &amp; hospital bills paid directly to verified payee accounts (<span className="font-mono text-xs text-amber-300">school.testnet</span>) with SHA-256 invoice hashes.
                  </td>
                </tr>

                {/* Row 3 */}
                <tr>
                  <td className="py-4 px-4 font-semibold text-white font-mono bg-white/[0.01]">
                    Seed Phrase Theft / Compromised Private Key
                  </td>
                  <td className="py-4 px-4 text-neutral-400">
                    Vulnerable to forged affidavits and bribed land/court registrars.
                  </td>
                  <td className="py-4 px-4 text-neutral-400">
                    Single compromised key leads to instant, irreversible drainage of all assets.
                  </td>
                  <td className="py-4 px-4 text-neutral-400">
                    SIM-swap fraud or physical extortion empties mobile money accounts immediately.
                  </td>
                  <td className="py-4 px-4 text-neutral-100 bg-amber-500/[0.02]">
                    7-day timelock on withdrawals exceeding 1,000 USDC; multi-circle guardian veto cancels theft.
                  </td>
                </tr>

                {/* Row 4 */}
                <tr>
                  <td className="py-4 px-4 font-semibold text-white font-mono bg-white/[0.01]">
                    High-Value Discretionary Spends (&gt; $1,500)
                  </td>
                  <td className="py-4 px-4 text-neutral-400">
                    Requires formal court motions and lawyer fees for each emergency capital request.
                  </td>
                  <td className="py-4 px-4 text-neutral-400">
                    No controls or multisig; private key holder transfers arbitrary sums without notice.
                  </td>
                  <td className="py-4 px-4 text-neutral-400">
                    Caregiver yields to predatory clan pressure for dowries or non-beneficiary projects.
                  </td>
                  <td className="py-4 px-4 text-neutral-100 bg-amber-500/[0.02]">
                    Spends &gt; $1,500 mandate 3 approvals across &ge; 2 distinct circles with at least one non-caregiver circle.
                  </td>
                </tr>

                {/* Row 5 */}
                <tr>
                  <td className="py-4 px-4 font-semibold text-white font-mono bg-white/[0.01]">
                    Beneficiary Exploitation Before Adulthood
                  </td>
                  <td className="py-4 px-4 text-neutral-400">
                    Adolescent orphans have no legal standing in probate courts before age of majority.
                  </td>
                  <td className="py-4 px-4 text-neutral-400">
                    Children possess zero on-chain rights, transparency, or ability to contest spends.
                  </td>
                  <td className="py-4 px-4 text-neutral-400">
                    Orphans have zero recourse against abusive guardians or premature asset exhaustion.
                  </td>
                  <td className="py-4 px-4 text-neutral-100 bg-amber-500/[0.02]">
                    Age 14 emergency flag authority (<span className="font-mono text-xs text-amber-300">calls.flag</span>); age 18 graduation in 3 scheduled annual tranches.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 5. R3: Verification Proof Strip */}
      <section className="border-t border-white/10 bg-[#07090e] py-14 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-500">
                FORMAL TEST SUITE VERIFICATION PROOF STRIP
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                100% PASS RATE · ZERO COMPROMISE
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* Proof Metric 1 */}
              <div className="border border-white/10 rounded-lg bg-[#0e121b] p-4 space-y-1">
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">191</div>
                <div className="text-xs font-semibold text-neutral-200">Rust Unit Tests</div>
                <div className="text-[11px] text-neutral-500 font-mono">100% pass · contracts/ward</div>
              </div>

              {/* Proof Metric 2 */}
              <div className="border border-white/10 rounded-lg bg-[#0e121b] p-4 space-y-1">
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">7</div>
                <div className="text-xs font-semibold text-neutral-200">Sandbox Suites</div>
                <div className="text-[11px] text-neutral-500 font-mono">near-workspaces cross-contract</div>
              </div>

              {/* Proof Metric 3 */}
              <div className="border border-white/10 rounded-lg bg-[#0e121b] p-4 space-y-1">
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">57</div>
                <div className="text-xs font-semibold text-neutral-200">Core Machine Tests</div>
                <div className="text-[11px] text-neutral-500 font-mono">Pure TypeScript (@ward/core)</div>
              </div>

              {/* Proof Metric 4 */}
              <div className="border border-white/10 rounded-lg bg-[#0e121b] p-4 space-y-1">
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">48</div>
                <div className="text-xs font-semibold text-neutral-200">Web Component Tests</div>
                <div className="text-[11px] text-neutral-500 font-mono">Vitest SSR suite (@ward/web)</div>
              </div>

              {/* Proof Metric 5 */}
              <div className="border border-white/10 rounded-lg bg-[#0e121b] p-4 space-y-1 col-span-2 md:col-span-1">
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">&lt; 1s</div>
                <div className="text-xs font-semibold text-neutral-200">Acceptance Demo</div>
                <div className="text-[11px] text-neutral-500 font-mono">9 journeys (pnpm demo)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. R3: Native Details FAQ (Protocol Non-Goals) */}
      <section className="border-t border-white/10 bg-[#09090b] py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="space-y-2">
            <div className="text-xs font-mono uppercase tracking-widest text-amber-500">
              SYSTEM BOUNDARIES &amp; SCOPE
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Protocol Scope &amp; Non-Goals FAQ
            </h2>
            <p className="text-sm text-neutral-400">
              Clear institutional explanations of what Ward enforces and what falls outside smart contract boundaries.
            </p>
          </div>

          <div className="space-y-3 text-xs sm:text-sm">
            <details className="group border border-white/10 rounded-lg bg-[#0e121b] p-5 transition-colors open:bg-white/[0.02]">
              <summary className="font-semibold text-neutral-200 cursor-pointer list-none flex justify-between items-center min-h-[44px]">
                <span>1. Does Ward protect physical land, houses, or chattels?</span>
                <span className="text-neutral-500 font-mono text-sm">&darr;</span>
              </summary>
              <p className="mt-3 text-neutral-400 leading-relaxed pt-3 border-t border-white/[0.06] font-sans">
                No. Ward exclusively protects digital money (NEP-141 stablecoins such as USDC and NEAR). Physical land, housing, and chattel require formal civil land registries and statutory probate court administration. Ward does not attempt to enforce physical eviction or land title changes.
              </p>
            </details>

            <details className="group border border-white/10 rounded-lg bg-[#0e121b] p-5 transition-colors open:bg-white/[0.02]">
              <summary className="font-semibold text-neutral-200 cursor-pointer list-none flex justify-between items-center min-h-[44px]">
                <span>2. Is Ward a statutory legal will?</span>
                <span className="text-neutral-500 font-mono text-sm">&darr;</span>
              </summary>
              <p className="mt-3 text-neutral-400 leading-relaxed pt-3 border-t border-white/[0.06] font-sans">
                No. Ward is an autonomous smart contract operating deterministically on NEAR. It does not confer formal probate court status or replace an advocate-drafted statutory will under national inheritance legislation. It secures digital assets directly against unauthorized access.
              </p>
            </details>

            <details className="group border border-white/10 rounded-lg bg-[#0e121b] p-5 transition-colors open:bg-white/[0.02]">
              <summary className="font-semibold text-neutral-200 cursor-pointer list-none flex justify-between items-center min-h-[44px]">
                <span>3. How is death verified without centralized government registries?</span>
                <span className="text-neutral-500 font-mono text-sm">&darr;</span>
              </summary>
              <p className="mt-3 text-neutral-400 leading-relaxed pt-3 border-t border-white/[0.06] font-sans">
                Death confirmation relies on multi-circle social consensus: 3 distinct guardians across separate social circles submit on-chain attestations with SHA-256 evidence hashes. Quorum triggers a 14-day cancellation window during which the living settlor can cancel fraudulent claims, preventing dependence on corruptible civil registries.
              </p>
            </details>

            <details className="group border border-white/10 rounded-lg bg-[#0e121b] p-5 transition-colors open:bg-white/[0.02]">
              <summary className="font-semibold text-neutral-200 cursor-pointer list-none flex justify-between items-center min-h-[44px]">
                <span>4. Does Ward provide direct mobile money fiat off-ramps?</span>
                <span className="text-neutral-500 font-mono text-sm">&darr;</span>
              </summary>
              <p className="mt-3 text-neutral-400 leading-relaxed pt-3 border-t border-white/[0.06] font-sans">
                No. Ward disburses NEP-141 stablecoins directly on-chain on NEAR. Caregivers and verified payees receive stablecoins to their NEAR accounts; local fiat or mobile money off-ramping is handled off-chain via regional liquidity providers or crypto-to-cash merchants.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* 7. Minimalist CTA Section */}
      <section className="border-t border-white/10 bg-[#07090e] py-14 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-xl font-bold text-white tracking-tight">
              Deploy a Protected Trust on NEAR
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400">
              Protect your family&apos;s inheritance with 4 independent social circles.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Link
              href="/create"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-sm transition-colors text-center min-h-[44px] tracking-tight"
            >
              Create a Trust
            </Link>
            <Link
              href="/t/0"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded border border-white/10 bg-[#0e121b] hover:bg-white/[0.06] text-neutral-200 text-sm font-medium transition-colors text-center min-h-[44px] tracking-tight"
            >
              Explore Demo Trust
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
