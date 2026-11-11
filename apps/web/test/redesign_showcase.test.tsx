import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import RootLayout from "../app/layout";
import HomePage from "../app/page";

describe("Ward Redesign Showcase Test Suite (NEAR Hackathon 2026 Social Money Track)", () => {
  const globalsCssPath = path.resolve(__dirname, "../app/globals.css");
  const globalsCss = fs.readFileSync(globalsCssPath, "utf-8");

  const trustPagePath = path.resolve(__dirname, "../app/t/[id]/page.tsx");
  const trustPageSrc = fs.readFileSync(trustPagePath, "utf-8");

  describe("R1: Institutional Minimalist Visual Architecture & Design Tokens", () => {
    it("defines obsidian canvas and charcoal surface theme tokens in globals.css", () => {
      expect(globalsCss).toContain("--bg-primary: #07090e;");
      expect(globalsCss).toContain("--bg-secondary: #09090b;");
      expect(globalsCss).toContain("--bg-surface: #0e121b;");
      expect(globalsCss).toContain("--bg-surface-raised: #141a27;");
    });

    it("defines hairline border and institutional accent tokens in globals.css", () => {
      expect(globalsCss).toContain("--border-hairline: rgba(255, 255, 255, 0.08);");
      expect(globalsCss).toContain("--border-subtle: rgba(255, 255, 255, 0.04);");
      expect(globalsCss).toContain("--border-strong: rgba(255, 255, 255, 0.12);");
      expect(globalsCss).toContain("--brand-amber: #f59e0b;");
      expect(globalsCss).toContain("--brand-ochre: #d97706;");
      expect(globalsCss).toContain("--emerald-accent: #10b981;");
      expect(globalsCss).toContain("--crimson-accent: #f43f5e;");
      expect(globalsCss).toContain("--steel-blue: #38bdf8;");
    });

    it("enforces tight letter-spacing tracking for crisp institutional typography", () => {
      expect(globalsCss).toContain("letter-spacing: -0.012em;");
      expect(globalsCss).toContain('font-feature-settings: "cv02", "cv03", "cv04", "cv11";');
    });

    it("enforces anti-AI aesthetic: zero gradient text tropes, generic cards, or neon drop shadows", () => {
      const homeHtml = renderToString(<HomePage />);
      // No gradient text clippings (e.g. text-transparent bg-clip-text)
      expect(homeHtml).not.toContain("bg-clip-text");
      expect(homeHtml).not.toContain("text-transparent");
      // No glowing neon dropshadows
      expect(homeHtml).not.toContain("shadow-[0_0_");
      expect(homeHtml).not.toContain("drop-shadow-[0_0_");
      // No tilted or rotated gimmick card containers
      expect(homeHtml).not.toMatch(/\b-?rotate-[1-6]\b/);
    });

    it("renders RootLayout with obsidian canvas, hairline borders, and institutional header/footer", () => {
      const layoutHtml = renderToString(
        <RootLayout>
          <div>Test Content Body</div>
        </RootLayout>
      );

      expect(layoutHtml).toContain("dark");
      expect(layoutHtml).toContain("bg-[#07090e]");
      expect(layoutHtml).toContain("border-white/10");
      expect(layoutHtml).toContain("Test Content Body");
      expect(layoutHtml).toContain("<header");
      expect(layoutHtml).toContain("<footer");
      expect(layoutHtml).toContain("Ward · Social Money on NEAR");
    });

    it("utilizes institutional palette utility classes across HomePage", () => {
      const homeHtml = renderToString(<HomePage />);
      expect(homeHtml).toContain("bg-[#07090e]");
      expect(homeHtml).toContain("bg-[#0e121b]");
      expect(homeHtml).toContain("bg-[#09090b]");
      expect(homeHtml).toContain("text-amber-400");
      expect(homeHtml).toContain("text-emerald-400");
    });
  });

  describe("R2: Asymmetric Bento Grid Protocol Metrics", () => {
    it("renders the Live Protected Balance feature tile (24,500 USDC)", () => {
      const html = renderToString(<HomePage />);

      expect(html).toContain("24,500 USDC");
      expect(html).toContain("NEP-141 USDC Protected Custody");
      expect(html).toContain("ward.testnet");
      expect(html).toContain("testnet.nearblocks.io/address/ward.testnet");
      expect(html).toContain("Non-Custodial Multi-Circle");
    });

    it("renders the Living Allowance Cadence metric (500 USDC / 30d)", () => {
      const html = renderToString(<HomePage />);

      expect(html).toContain("500 USDC / 30d");
      expect(html).toContain("Living Allowance Cadence to Caregiver");
      expect(html).toContain("1,000 USDC / 30d Cap");
      expect(html).toContain("Scheduled Cadence");
    });

    it("renders the 4-Circle Quorum metric (3 approvals across >= 2 circles)", () => {
      const html = renderToString(<HomePage />);

      // Supports both HTML entity &ge; or unicode ≥
      const hasQuorumText =
        html.includes("3 approvals across &ge; 2 circles") ||
        html.includes("3 approvals across ≥ 2 circles");
      expect(hasQuorumText).toBe(true);

      // Verifies all 4 distinct social circles are rendered in the quorum tile
      expect(html).toContain("Maternal");
      expect(html).toContain("Paternal");
      expect(html).toContain("Community");
      expect(html).toContain("Institution");
    });

    it("renders the Anti-Theft Timelock metric (7 days)", () => {
      const html = renderToString(<HomePage />);

      expect(html).toContain("7 days");
      expect(html).toContain("Anti-Theft Timelock on Over-Cap Outflows");
      expect(html).toContain("2 Distinct Circles Required");
      expect(html).toContain("calls.vetoWithdrawal");
      expect(html).toContain("7-Day Veto Window");
    });

    it("structures metrics within an asymmetric Bento grid layout with hairline borders", () => {
      const html = renderToString(<HomePage />);

      expect(html).toContain("grid-cols-1");
      expect(html).toContain("lg:grid-cols-12");
      expect(html).toContain("lg:col-span-7");
      expect(html).toContain("lg:col-span-5");
      expect(html).toContain("border-white/10");
      expect(html).toContain("bg-[#0e121b]");
    });
  });

  describe("R3: Institutional Evidence (Spec Sheet, Threat Model, Proof Strip, FAQ)", () => {
    it("renders the live architectural spec sheet for canonical Trust #0 (Ada & Tobi)", () => {
      const html = renderToString(<HomePage />);

      expect(html).toContain("Ada &amp; Tobi Education &amp; Care Trust");
      expect(html).toContain("TRUST #0 · ward.testnet");
      expect(html).toContain("Active Support");
      expect(html).toContain("24,500 USDC");
      expect(html).toContain("500 USDC / 30d");
      expect(html).toContain("1,500 USDC");
      expect(html).toContain("ada.testnet");
      expect(html).toContain("tobi.testnet");
      expect(html).toContain("Ada");
      expect(html).toContain("Tobi");
      expect(html).toContain("5,000 bps");
      expect(html).toContain("ward-dao.sputnik-dao.near");
      expect(html).toContain("St. Mary&#x27;s Academy (School)");
    });

    it("aligns fallback DEMO_TRUST in app/t/[id]/page.tsx with canonical Trust #0", () => {
      expect(trustPageSrc).toContain('label: "Ada & Tobi Education & Care Trust"');
      expect(trustPageSrc).toContain("maternal_aunt.testnet");
      expect(trustPageSrc).toContain("paternal_uncle.testnet");
      expect(trustPageSrc).toContain("pastor_community.testnet");
      expect(trustPageSrc).toContain("teacher_institute.testnet");
      expect(trustPageSrc).toContain('account: "ada.testnet"');
      expect(trustPageSrc).toContain('account: "tobi.testnet"');
      expect(trustPageSrc).toContain("death_quorum: 3");
      expect(trustPageSrc).toContain('large_threshold: "1500000000"');
      expect(trustPageSrc).toContain('withdraw_delay: "604800000000000"');
    });

    it("renders the 4-column side-by-side Threat Model comparison matrix", () => {
      const html = renderToString(<HomePage />);

      expect(html).toContain("<table");
      // 4-column headers
      expect(html).toContain("Scenario / Threat Vector");
      expect(html).toContain("Civil Probate");
      expect(html).toContain("Single-Key Wallet");
      expect(html).toContain("Caregiver Discretion");
      expect(html).toContain("Ward Invariants");

      // 5 attack scenarios
      expect(html).toContain("Settlor Incapacitation / Sudden Passing");
      expect(html).toContain("Caregiver Embezzlement / Asset Stripping");
      expect(html).toContain("Seed Phrase Theft / Compromised Private Key");
      expect(html).toContain("High-Value Discretionary Spends");
      expect(html).toContain("Beneficiary Exploitation Before Adulthood");

      // Ward invariant solutions
      expect(html).toContain("school.testnet");
      expect(html).toContain("calls.flag");
      expect(html).toContain("7-day timelock");
    });

    it("renders the complete 5-metric Verification Proof Strip", () => {
      const html = renderToString(<HomePage />);

      // Metric 1: 191 Rust Unit Tests
      expect(html).toContain("191");
      expect(html).toContain("Rust Unit Tests");

      // Metric 2: 7 Sandbox Integration Suites
      expect(html).toContain("7");
      expect(html).toContain("Sandbox Suites");

      // Metric 3: 57 Core Machine Tests
      expect(html).toContain("57");
      expect(html).toContain("Core Machine Tests");

      // Metric 4: 48 Web Component Tests
      expect(html).toContain("48");
      expect(html).toContain("Web Component Tests");

      // Metric 5: < 1s Acceptance Demo
      const hasDemoMetric = html.includes("&lt; 1s") || html.includes("< 1s");
      expect(hasDemoMetric).toBe(true);
      expect(html).toContain("Acceptance Demo");
    });

    it("renders the native details FAQ addressing all protocol non-goals", () => {
      const html = renderToString(<HomePage />);

      // Native details and summary elements
      expect(html).toContain("<details");
      expect(html).toContain("<summary");

      // Non-Goal 1: Money only, no physical land/house probate
      expect(html).toContain("Does Ward protect physical land, houses, or chattels?");
      expect(html).toContain("exclusively protects digital money");

      // Non-Goal 2: Autonomous smart contract, not a statutory legal will
      expect(html).toContain("Is Ward a statutory legal will?");
      expect(html).toContain("autonomous smart contract operating deterministically on NEAR");

      // Non-Goal 3: Social consensus death proof, not government registries
      expect(html).toContain("How is death verified without centralized government registries?");
      expect(html).toContain("multi-circle social consensus");

      // Non-Goal 4: On-chain stablecoins, not direct mobile money fiat off-ramps
      expect(html).toContain("Does Ward provide direct mobile money fiat off-ramps?");
      expect(html).toContain("disburses NEP-141 stablecoins directly on-chain on NEAR");
    });
  });

  describe("R4: Functional Interactivity & Semantic Layout Invariants", () => {
    it("preserves semantic heading hierarchy and responsive layout class on HomePage", () => {
      const html = renderToString(<HomePage />);

      expect(html).toContain("<h1");
      expect(html).toContain("<h2");
      expect(html).toContain("grid-cols-1");
    });

    it("preserves critical action links to /create and /t/0", () => {
      const html = renderToString(<HomePage />);

      expect(html).toContain("Create a Trust");
      expect(html).toContain("Explore Demo Trust");
      expect(html).toContain('href="/create"');
      expect(html).toContain('href="/t/0"');
    });

    it("preserves accessibility skip-to-content navigation in RootLayout", () => {
      const html = renderToString(
        <RootLayout>
          <div>Main Content View</div>
        </RootLayout>
      );

      expect(html).toContain('href="#main-content"');
      expect(html).toContain("Skip to main content");
      expect(html).toContain('id="main-content"');
      expect(html).toContain('tabindex="-1"');
      expect(html).toContain('aria-label="Main Navigation"');
    });
  });

  describe("R5: Non-Attribution & Adversarial Integrity Verification", () => {
    it("verifies zero AI assistant attribution across layout, page, and styles", () => {
      const pagePath = path.resolve(__dirname, "../app/page.tsx");
      const layoutPath = path.resolve(__dirname, "../app/layout.tsx");

      const pageSrc = fs.readFileSync(pagePath, "utf-8");
      const layoutSrc = fs.readFileSync(layoutPath, "utf-8");

      const forbiddenTerms = [
        "chatgpt",
        "claude",
        "copilot",
        "anthropic",
        "openai",
        "llm",
        "ai generated",
        "synthetic",
      ];

      for (const term of forbiddenTerms) {
        expect(pageSrc.toLowerCase()).not.toContain(term);
        expect(layoutSrc.toLowerCase()).not.toContain(term);
        expect(globalsCss.toLowerCase()).not.toContain(term);
        expect(trustPageSrc.toLowerCase()).not.toContain(term);
      }
    });

    it("enforces minimum touch target size (min-h-[44px]) on interactive elements", () => {
      const homeHtml = renderToString(<HomePage />);
      const layoutHtml = renderToString(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      // Links, buttons, and summary elements must support minimum 44px touch targets
      expect(homeHtml).toContain("min-h-[44px]");
      expect(layoutHtml).toContain("min-h-[44px]");
    });

    it("verifies HTML entity escaping integrity (no double-escaping or broken entities)", () => {
      const homeHtml = renderToString(<HomePage />);

      // Ensure no double-escaped entities like &amp;amp; or &amp;quot;
      expect(homeHtml).not.toContain("&amp;amp;");
      expect(homeHtml).not.toContain("&amp;quot;");
      expect(homeHtml).not.toContain("&amp;lt;");
      expect(homeHtml).not.toContain("&amp;gt;");
      expect(homeHtml).not.toContain("&amp;#x27;");
    });

    it("verifies RootLayout handles empty and minimal child content gracefully", () => {
      const emptyLayout = renderToString(
        <RootLayout>
          <></>
        </RootLayout>
      );

      expect(emptyLayout).toContain('id="main-content"');
      expect(emptyLayout).toContain("Skip to main content");
      expect(emptyLayout).toContain("Ward");
    });
  });
});
