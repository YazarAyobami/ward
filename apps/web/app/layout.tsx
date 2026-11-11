import "./globals.css";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "Ward — Children's Trust on NEAR",
  description: "A children's trust no single relative can empty — protecting orphans from property grabbing.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark bg-[#07090e] text-neutral-100 antialiased">
      <body className="min-h-screen flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-200 bg-[#07090e]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-amber-500 focus:text-neutral-950 focus:rounded-md focus:font-bold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-300 text-xs"
        >
          Skip to main content
        </a>

        <header className="border-b border-white/10 bg-[#07090e]/90 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5 group min-h-[44px] py-1" aria-label="Ward Home">
              <span className="w-7 h-7 rounded bg-amber-500 text-neutral-950 font-black text-xs flex items-center justify-center tracking-tight group-hover:bg-amber-400 transition-colors">
                W
              </span>
              <span className="font-bold tracking-tight text-white group-hover:text-amber-300 transition-colors">
                Ward
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-widest text-neutral-400 border border-white/10 px-1.5 py-0.5 rounded bg-white/[0.02]">
                TESTNET · PROTOCOL
              </span>
            </Link>

            <nav aria-label="Main Navigation" className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
              <Link
                href="/t/0"
                className="text-neutral-300 hover:text-white transition-colors px-3 py-2 min-h-[44px] flex items-center rounded border border-transparent hover:border-white/10 hover:bg-white/[0.02] font-medium"
              >
                Demo Trust
              </Link>
              <Link
                href="/create"
                className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold px-3.5 py-2 min-h-[44px] flex items-center rounded transition-colors text-xs tracking-tight shadow-sm"
              >
                Create Trust
              </Link>
            </nav>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>

        <footer className="border-t border-white/10 bg-[#07090e] text-neutral-400 text-xs py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <p className="font-semibold text-neutral-300 tracking-tight">Ward · Social Money on NEAR</p>
              <p className="text-neutral-500 mt-1">
                Autonomous children&apos;s trust protocol protecting orphans and surviving families from property grabbing.
              </p>
            </div>
            <div className="flex items-center gap-4 text-neutral-400 font-mono text-[11px]">
              <Link href="/create" className="hover:text-white transition-colors">Create Trust</Link>
              <Link href="/t/0" className="hover:text-white transition-colors">Explorer</Link>
              <a
                href="https://github.com/YazarAyobami/ward"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
