import Link from "next/link";

export default function HomePage() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-16 sm:pt-20 sm:pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 mb-6">
          <span>NEAR Hackathon 2026</span>
          <span className="text-amber-500/60">•</span>
          <span>Social Money Track</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-neutral-100 max-w-4xl mx-auto leading-tight">
          A children&apos;s trust no single relative can empty.
        </h1>

        {/* Problem Statement (2 sentences) */}
        <div className="mt-6 max-w-2xl mx-auto text-sm sm:text-base md:text-lg text-neutral-300 space-y-2 leading-relaxed">
          <p>
            When a parent dies in much of sub-Saharan Africa, relatives frequently seize money and property meant for the surviving spouse and children—a widespread injustice known as property grabbing.
          </p>
          <p className="text-neutral-400">
            Ward enforces social money rules on NEAR so that post-death support flows under immutable checks and balances that no single relative or clan circle can override.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-xs sm:max-w-md mx-auto">
          <Link
            href="/create"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-sm sm:text-base transition-colors shadow-sm"
          >
            Create a Trust
          </Link>
          <Link
            href="/t/0"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 font-medium text-sm sm:text-base transition-colors"
          >
            Explore Demo Trust
          </Link>
        </div>
      </section>

      {/* How It Works (4 Steps) */}
      <section className="border-t border-neutral-800/80 bg-neutral-900/40 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100">
              How Ward Works
            </h2>
            <p className="mt-2 text-sm text-neutral-400">
              Four protective phases built directly into NEAR smart contracts to safeguard vulnerable heirs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-sm border border-amber-500/30">
                  1
                </span>
                <h3 className="text-base sm:text-lg font-semibold text-neutral-100">
                  Fund &amp; Appoint Independent Circles
                </h3>
              </div>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Parents deposit NEP-141 tokens (e.g. USDC) and designate children with percentage shares. Guardians are appointed across at least two independent social circles (Maternal, Paternal, Community, Institution)—guaranteeing no single family faction holds a monopoly on approvals.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-sm border border-amber-500/30">
                  2
                </span>
                <h3 className="text-base sm:text-lg font-semibold text-neutral-100">
                  Attest Death with Quorum
                </h3>
              </div>
              <p className="text-sm text-neutral-400 leading-relaxed">
                When a parent passes away, guardians submit death attestations along with IPFS death certificate hashes. Reaching the required threshold triggers an on-chain grace period: if the parent is alive, they can instantly dismiss fraudulent claims.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-sm border border-amber-500/30">
                  3
                </span>
                <h3 className="text-base sm:text-lg font-semibold text-neutral-100">
                  Protected Post-Death Support
                </h3>
              </div>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Capped monthly allowances flow directly to the designated caregiver with strict limits against accumulating past arrears. Direct vendor disbursements (school fees, hospital bills) require verified guardians; large expenses require multi-circle consensus.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-sm border border-amber-500/30">
                  4
                </span>
                <h3 className="text-base sm:text-lg font-semibold text-neutral-100">
                  Graduation &amp; Public Ledger
                </h3>
              </div>
              <p className="text-sm text-neutral-400 leading-relaxed">
                As children reach age 18, their remaining share is disbursed in controlled milestone tranches rather than a vulnerable lump sum. Every expenditure, balance change, and vote is recorded immutably on the public blockchain ledger.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Guarantees section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="border border-neutral-800 rounded-2xl bg-neutral-900/50 p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xl">
            <h3 className="text-xl sm:text-2xl font-bold text-neutral-100">
              Built for real-world social protection
            </h3>
            <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
              Ward replaces corruptible human promises with mathematical contracts and distributed clan circles. Explore an active demo trust or deploy your own protective trust on NEAR testnet today.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Link
              href="/create"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-sm transition-colors text-center"
            >
              Get Started
            </Link>
            <Link
              href="/t/0"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium transition-colors text-center"
            >
              View Public Ledger
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
