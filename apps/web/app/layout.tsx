import "./globals.css";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "Ward — Children's Trust on NEAR",
  description: "A children's trust no single relative can empty — protecting orphans from property grabbing.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark bg-neutral-950 text-neutral-100 antialiased">
      <body className="min-h-screen flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-200">
        <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="w-7 h-7 rounded bg-amber-500 text-neutral-950 font-black text-sm flex items-center justify-center tracking-tighter group-hover:bg-amber-400 transition-colors">
                W
              </span>
              <span className="font-bold tracking-tight text-neutral-100 group-hover:text-amber-300 transition-colors">
                Ward
              </span>
            </Link>

            <nav className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
              <Link
                href="/t/0"
                className="text-neutral-400 hover:text-neutral-200 transition-colors px-2 py-1 rounded"
              >
                Demo Trust
              </Link>
              <Link
                href="/create"
                className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold px-3 py-1.5 rounded transition-colors text-xs sm:text-sm"
              >
                Create Trust
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-neutral-800/80 bg-neutral-950 text-neutral-500 text-xs py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <p className="font-medium text-neutral-400">Ward · Social Money on NEAR</p>
              <p className="text-neutral-500 mt-1">Protecting orphans and surviving families from property grabbing.</p>
            </div>
            <div className="flex items-center gap-4 text-neutral-400">
              <Link href="/create" className="hover:text-neutral-200 transition-colors">Create</Link>
              <Link href="/t/0" className="hover:text-neutral-200 transition-colors">Explorer</Link>
              <a
                href="https://github.com/YazarAyobami/ward"
                target="_blank"
                rel="noreferrer"
                className="hover:text-neutral-200 transition-colors"
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
