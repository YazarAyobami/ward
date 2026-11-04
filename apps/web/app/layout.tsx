// Shell + DEMO MODE banner when time_scale ≠ 1 (W-7.1).
import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "Ward", description: "A children's trust no single relative can empty" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* TODO(W-7.1): DemoModeBanner reading trust.rules.time_scale */}
        {children}
      </body>
    </html>
  );
}
