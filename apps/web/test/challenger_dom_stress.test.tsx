import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import HomePage from "../app/page";
import RootLayout from "../app/layout";
import TrustPage from "../app/t/[id]/page";
import { Trust } from "@ward/core";

// ---------------------------------------------------------------------------
// HTML Parser & Strict Tree Validator Oracle
// ---------------------------------------------------------------------------
interface TagOpen {
  tag: string;
  index: number;
}

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function validateHtmlTree(html: string): {
  isValid: boolean;
  unclosedTags: string[];
  malformedTables: string[];
  malformedDetails: string[];
  nestingViolations: string[];
  doubleEscapedEntities: string[];
} {
  const stack: TagOpen[] = [];
  const unclosedTags: string[] = [];
  const nestingViolations: string[] = [];
  const malformedTables: string[] = [];
  const malformedDetails: string[] = [];
  const doubleEscapedEntities: string[] = [];

  // 1. Double escaping check: detects &amp;amp;, &amp;quot;, &amp;lt;, &amp;gt;, &amp;#x27;, etc.
  const commonDoubleEscape = /&amp;(amp|quot|lt|gt|#x27|#39|ge|le|darr|rarr);/g;
  let deMatch: RegExpExecArray | null;
  while ((deMatch = commonDoubleEscape.exec(html)) !== null) {
    doubleEscapedEntities.push(deMatch[0]);
  }

  // 2. Tokenize tags
  const tagRegex = /<\/?([a-zA-Z0-9:-]+)([^>]*?)(\/?)>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html)) !== null) {
    const fullTag = match[0];
    const tagName = (match[1] ?? "").toLowerCase();
    const isClosing = fullTag.startsWith("</");
    const isSelfClosing = match[3] === "/" || VOID_TAGS.has(tagName);

    if (fullTag.startsWith("<!--") || fullTag.startsWith("<!DOCTYPE")) {
      continue;
    }

    if (isClosing) {
      if (VOID_TAGS.has(tagName)) {
        nestingViolations.push(`Closing tag encountered for void element <${tagName}> at index ${match.index}`);
        continue;
      }

      if (stack.length === 0) {
        nestingViolations.push(`Unexpected closing tag </${tagName}> without open tag at index ${match.index}`);
        continue;
      }

      const top = stack.pop()!;
      if (top.tag !== tagName) {
        nestingViolations.push(
          `Tag mismatch: expected </${top.tag}> opened at ${top.index}, but got </${tagName}> at index ${match.index}`
        );
      }
    } else if (!isSelfClosing) {
      if (tagName === "a" && stack.some((t) => t.tag === "a")) {
        nestingViolations.push(`Forbidden nesting: <a> inside <a> at index ${match.index}`);
      }
      if (tagName === "p" && stack.some((t) => t.tag === "p")) {
        nestingViolations.push(`Forbidden nesting: <p> inside <p> at index ${match.index}`);
      }

      stack.push({ tag: tagName, index: match.index });
    }
  }

  while (stack.length > 0) {
    const remaining = stack.pop()!;
    unclosedTags.push(`<${remaining.tag}> opened at ${remaining.index}`);
  }

  // 3. Table structural hierarchy check: <table> must contain <thead>, <tbody>, or <tr> directly
  const tableContentRegex = /<table[^>]*>([\s\S]*?)<\/table>/g;
  let tableMatch: RegExpExecArray | null;
  while ((tableMatch = tableContentRegex.exec(html)) !== null) {
    const tableBody = tableMatch[1] ?? "";
    if (!tableBody.includes("<thead") || !tableBody.includes("<tbody")) {
      malformedTables.push(`Table missing thead or tbody: ${tableMatch[0].slice(0, 50)}...`);
    }
    const strippedTable = tableBody
      .replace(/<thead[^>]*>[\s\S]*?<\/thead>/g, "")
      .replace(/<tbody[^>]*>[\s\S]*?<\/tbody>/g, "")
      .trim();
    if (strippedTable.includes("<tr")) {
      malformedTables.push(`Stray <tr> found outside <thead>/<tbody> in table: ${tableMatch[0].slice(0, 50)}`);
    }
  }

  // 4. Details / Summary hierarchy check: <details> must have <summary> as first child
  const detailsContentRegex = /<details[^>]*>([\s\S]*?)<\/details>/g;
  let detailsMatch: RegExpExecArray | null;
  while ((detailsMatch = detailsContentRegex.exec(html)) !== null) {
    const detailsBody = (detailsMatch[1] ?? "").trim();
    if (!detailsBody.startsWith("<summary")) {
      malformedDetails.push(
        `<details> does not have <summary> as first element: ${detailsMatch[0].slice(0, 60)}...`
      );
    }
  }

  const isValid =
    unclosedTags.length === 0 &&
    nestingViolations.length === 0 &&
    malformedTables.length === 0 &&
    malformedDetails.length === 0 &&
    doubleEscapedEntities.length === 0;

  return {
    isValid,
    unclosedTags,
    malformedTables,
    malformedDetails,
    nestingViolations,
    doubleEscapedEntities,
  };
}

// ---------------------------------------------------------------------------
// WCAG 2.1 Luminance & Contrast Calculation Oracle
// ---------------------------------------------------------------------------
function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex, 16);
  if (cleanHex.length === 6) {
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }
  if (cleanHex.length === 3) {
    const r = (num >> 8) & 15;
    const g = (num >> 4) & 15;
    const b = num & 15;
    return [(r << 4) | r, (g << 4) | g, (b << 4) | b];
  }
  throw new Error(`Invalid hex color: ${hex}`);
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const l1 = relativeLuminance(r1, g1, b1);
  const l2 = relativeLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ===========================================================================
// Empirical Challenger Verification Suite
// ===========================================================================
describe("Adversarial Verification Suite — Challenger 1", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.reject(new Error("RPC offline in test harness"))
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Challenge 1: Adversarial DOM & String Invariant Check
  // -------------------------------------------------------------------------
  describe("Challenge 1: Adversarial DOM & String Invariants", () => {
    it("renders HomePage to valid HTML without unclosed tags, malformed tables, or nesting errors", () => {
      const html = renderToString(<HomePage />);
      const check = validateHtmlTree(html);

      expect(check.unclosedTags).toEqual([]);
      expect(check.nestingViolations).toEqual([]);
      expect(check.malformedTables).toEqual([]);
      expect(check.malformedDetails).toEqual([]);
      expect(check.doubleEscapedEntities).toEqual([]);
      expect(check.isValid).toBe(true);
    });

    it("renders RootLayout to valid HTML with both normal and empty children", () => {
      const normalHtml = renderToString(
        <RootLayout>
          <div id="test-child">Child Element Content</div>
        </RootLayout>
      );
      const normalCheck = validateHtmlTree(normalHtml);
      expect(normalCheck.unclosedTags).toEqual([]);
      expect(normalCheck.nestingViolations).toEqual([]);
      expect(normalCheck.isValid).toBe(true);

      const emptyHtml = renderToString(
        <RootLayout>
          <></>
        </RootLayout>
      );
      const emptyCheck = validateHtmlTree(emptyHtml);
      expect(emptyCheck.unclosedTags).toEqual([]);
      expect(emptyCheck.nestingViolations).toEqual([]);
      expect(emptyCheck.isValid).toBe(true);
    });

    it("stress-renders TrustPage with diverse parametric inputs without DOM corruption or crashes", async () => {
      const testCases = [
        "0", // Canonical Trust #0
        "1", // Other numeric trust
        "999999", // High ID
        "invalid-id", // NaN input
        "", // Empty input
        "-42", // Negative ID
        "<script>alert(1)</script>", // XSS attempt in route param
      ];

      for (const id of testCases) {
        const jsx = await TrustPage({ params: Promise.resolve({ id }) });
        const html = renderToString(jsx);
        const check = validateHtmlTree(html);

        expect(check.unclosedTags).toEqual([]);
        expect(check.nestingViolations).toEqual([]);
        expect(check.doubleEscapedEntities).toEqual([]);
        expect(check.isValid).toBe(true);
      }
    });

    it("renders TrustPage with fetched RPC data when network returns valid trust response", async () => {
      const mockTrustPayload: Trust = {
        id: 77,
        label: "Live RPC Mocked Trust",
        settlor: "settlor.testnet",
        dao: "dao.testnet",
        caregiver: "caregiver.testnet",
        caregiver_circle: "Maternal",
        guardians: [
          { account: "g1.testnet", circle: "Maternal" },
          { account: "g2.testnet", circle: "Paternal" },
          { account: "g3.testnet", circle: "Community" },
        ],
        children: [
          {
            label: "Kofi",
            account: "kofi.testnet",
            birth_ts: "1500000000000000000",
            share_bps: 10000,
            paid_out: "0",
            tranches_paid: 0,
            alive: true,
          },
        ],
        payees: [],
        rules: {
          allowance_amount: "300000000",
          allowance_period: "2592000000000000",
          large_threshold: "1000000000",
          death_quorum: 2,
          waiting_period: "1209600000000000",
          withdraw_free_cap: "500000000",
          withdraw_delay: "604800000000000",
          cancel_window: "2592000000000000",
          graduation_tranches: 3,
          max_open_requests: 10,
          flag_age_years: 14,
          majority_age_years: 18,
          fallback: [],
          time_scale: 1,
        },
        token: "usdc.testnet",
        balance: "15000000000",
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
        activation_balance: "15000000000",
        created_at: "1729000000000000000",
      };

      const trustBytes = Array.from(Buffer.from(JSON.stringify(mockTrustPayload)));
      const requestsBytes = Array.from(Buffer.from(JSON.stringify([])));

      vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
        const bodyStr = init?.body as string;
        if (bodyStr.includes('"method_name":"get_trust"')) {
          return {
            ok: true,
            json: async () => ({
              result: { result: trustBytes },
            }),
          } as unknown as Response;
        }
        if (bodyStr.includes('"method_name":"get_requests"')) {
          return {
            ok: true,
            json: async () => ({
              result: { result: requestsBytes },
            }),
          } as unknown as Response;
        }
        return {
          ok: false,
          status: 404,
          statusText: "Not found",
        } as unknown as Response;
      });

      const jsx = await TrustPage({ params: Promise.resolve({ id: "77" }) });
      const html = renderToString(jsx);
      const check = validateHtmlTree(html);

      expect(check.isValid).toBe(true);
      expect(html).toContain("Live RPC Mocked Trust");
      expect(html).toContain("15000 USDC");
    });

    it("confirms 12-column asymmetric Bento grid classes (2x lg:col-span-7, 2x lg:col-span-5)", () => {
      const html = renderToString(<HomePage />);

      expect(html).toContain("grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4");

      const colSpan7Matches = (html.match(/lg:col-span-7/g) || []).length;
      const colSpan5Matches = (html.match(/lg:col-span-5/g) || []).length;

      // In the Bento section, there are exactly 2 tiles of col-span-7 and 2 tiles of col-span-5 (7+5 = 12 per row)
      expect(colSpan7Matches).toBe(2);
      expect(colSpan5Matches).toBe(2);
    });

    it("confirms all 5 verification metrics in the proof strip without truncation or corruption", () => {
      const html = renderToString(<HomePage />);

      // Metric 1: 191 Rust Unit Tests
      expect(html).toMatch(/<div[^>]*>191<\/div>\s*<div[^>]*>Rust Unit Tests<\/div>/);
      expect(html).toContain("contracts/ward");

      // Metric 2: 7 Sandbox Suites
      expect(html).toMatch(/<div[^>]*>7<\/div>\s*<div[^>]*>Sandbox Suites<\/div>/);
      expect(html).toContain("near-workspaces cross-contract");

      // Metric 3: 57 Core Machine Tests
      expect(html).toMatch(/<div[^>]*>57<\/div>\s*<div[^>]*>Core Machine Tests<\/div>/);
      expect(html).toContain("Pure TypeScript (@ward/core)");

      // Metric 4: 48 Web Component Tests
      expect(html).toMatch(/<div[^>]*>48<\/div>\s*<div[^>]*>Web Component Tests<\/div>/);
      expect(html).toContain("Vitest SSR suite (@ward/web)");

      // Metric 5: < 1s Acceptance Demo
      expect(html).toMatch(/(&lt;|<)\s*1s/);
      expect(html).toContain("Acceptance Demo");
      expect(html).toContain("9 journeys (pnpm demo)");
    });

    it("confirms all critical strings in Bento metrics, Trust #0 spec, Threat Model, and FAQ", () => {
      const html = renderToString(<HomePage />);

      // Bento 4 metrics
      expect(html).toContain("24,500 USDC");
      expect(html).toContain("500 USDC / 30d");
      expect(html).toMatch(/3 approvals across (&ge;|≥) 2 circles/);
      expect(html).toContain("7 days");

      // Trust #0 Spec
      expect(html).toContain("Ada &amp; Tobi Education &amp; Care Trust");
      expect(html).toContain("ward-dao.sputnik-dao.near");
      expect(html).toContain("1,500 USDC");
      expect(html).toContain("1,000 USDC / 30d");
      expect(html).toContain("5,000 bps");

      // Threat Model Table: 4 columns
      expect(html).toContain("Civil Probate");
      expect(html).toContain("Single-Key Wallet");
      expect(html).toContain("Caregiver Discretion");
      expect(html).toContain("Ward Invariants");

      // Threat Model Table: 5 scenarios
      expect(html).toContain("Settlor Incapacitation / Sudden Passing");
      expect(html).toContain("Caregiver Embezzlement / Asset Stripping");
      expect(html).toContain("Seed Phrase Theft / Compromised Private Key");
      expect(html).toContain("High-Value Discretionary Spends (&gt; $1,500)");
      expect(html).toContain("Beneficiary Exploitation Before Adulthood");

      // FAQ: 4 questions
      expect(html).toContain("Does Ward protect physical land, houses, or chattels?");
      expect(html).toContain("Is Ward a statutory legal will?");
      expect(html).toContain("How is death verified without centralized government registries?");
      expect(html).toContain("Does Ward provide direct mobile money fiat off-ramps?");
    });
  });

  // -------------------------------------------------------------------------
  // Challenge 2: Accessibility & Contrast Verification
  // -------------------------------------------------------------------------
  describe("Challenge 2: Accessibility & Contrast Verification", () => {
    const darkCanvas = "#07090e";
    const darkSecondary = "#09090b";
    const darkSurface = "#0e121b";

    it("verifies WCAG high-contrast readability of primary text colors against dark canvases", () => {
      const textColors = [
        { name: "text-white", hex: "#ffffff", minRatio: 7.0 }, // AAA
        { name: "text-neutral-100", hex: "#f5f5f5", minRatio: 7.0 }, // AAA
        { name: "text-neutral-200", hex: "#e5e5e5", minRatio: 7.0 }, // AAA
        { name: "text-neutral-300", hex: "#d4d4d4", minRatio: 7.0 }, // AAA
        { name: "text-neutral-400", hex: "#a3a3a3", minRatio: 4.5 }, // AA normal
        { name: "text-amber-400", hex: "#fbbf24", minRatio: 4.5 }, // AA normal
        { name: "text-emerald-400", hex: "#34d399", minRatio: 4.5 }, // AA normal
        { name: "text-rose-400", hex: "#fb7185", minRatio: 4.5 }, // AA normal
        { name: "text-sky-400", hex: "#38bdf8", minRatio: 4.5 }, // AA normal
      ];

      for (const tc of textColors) {
        const ratioCanvas = contrastRatio(tc.hex, darkCanvas);
        const ratioSecondary = contrastRatio(tc.hex, darkSecondary);
        const ratioSurface = contrastRatio(tc.hex, darkSurface);

        expect(
          ratioCanvas,
          `${tc.name} (${tc.hex}) on canvas (${darkCanvas}) should exceed ${tc.minRatio}:1 (got ${ratioCanvas.toFixed(2)})`
        ).toBeGreaterThanOrEqual(tc.minRatio);

        expect(
          ratioSecondary,
          `${tc.name} (${tc.hex}) on secondary (${darkSecondary}) should exceed ${tc.minRatio}:1 (got ${ratioSecondary.toFixed(2)})`
        ).toBeGreaterThanOrEqual(tc.minRatio);

        expect(
          ratioSurface,
          `${tc.name} (${tc.hex}) on surface (${darkSurface}) should exceed ${tc.minRatio}:1 (got ${ratioSurface.toFixed(2)})`
        ).toBeGreaterThanOrEqual(tc.minRatio);
      }
    });

    it("verifies contrast of secondary text (text-neutral-500) meets WCAG large/incidental criteria", () => {
      const ratio = contrastRatio("#737373", darkCanvas);
      // neutral-500 has a contrast ratio of ~4.16:1 against #07090e, which satisfies WCAG AA for large text (>=3:1)
      // and incidental/supplemental metadata labels (like uppercase sub-labels)
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    });

    it("verifies interactive touch target compliance across primary buttons, links, and disclosure triggers", () => {
      const homeHtml = renderToString(<HomePage />);
      const layoutHtml = renderToString(
        <RootLayout>
          <div>Body</div>
        </RootLayout>
      );

      // Hero action buttons: check that both Create and Explore buttons have min-h-[44px]
      const heroCreateMatch = homeHtml.match(/<a[^>]*href="\/create"[^>]*>Create a Trust<\/a>/);
      expect(heroCreateMatch).not.toBeNull();
      expect(heroCreateMatch![0]).toContain("min-h-[44px]");

      const heroExploreMatch = homeHtml.match(/<a[^>]*href="\/t\/0"[^>]*>Explore Demo Trust<\/a>/);
      expect(heroExploreMatch).not.toBeNull();
      expect(heroExploreMatch![0]).toContain("min-h-[44px]");

      // RootLayout nav items and logo
      const logoMatch = layoutHtml.match(/<a[^>]*aria-label="Ward Home"[^>]*>/);
      expect(logoMatch).not.toBeNull();
      expect(logoMatch![0]).toContain("min-h-[44px]");

      const navDemoMatch = layoutHtml.match(/<a[^>]*href="\/t\/0"[^>]*>Demo Trust<\/a>/);
      expect(navDemoMatch).not.toBeNull();
      expect(navDemoMatch![0]).toContain("min-h-[44px]");

      const navCreateMatch = layoutHtml.match(/<a[^>]*href="\/create"[^>]*>Create Trust<\/a>/);
      expect(navCreateMatch).not.toBeNull();
      expect(navCreateMatch![0]).toContain("min-h-[44px]");

      // Details summary interactive trigger in FAQ
      const detailsCount = (homeHtml.match(/<details/g) || []).length;
      const minHSummaryCount = (homeHtml.match(/<summary[^>]*min-h-\[44px\]/g) || []).length;
      expect(minHSummaryCount).toBe(detailsCount);
      expect(minHSummaryCount).toBe(4);
    });

    it("confirms skip-to-content navigation accessibility link in RootLayout", () => {
      const layoutHtml = renderToString(
        <RootLayout>
          <div>Body</div>
        </RootLayout>
      );

      expect(layoutHtml).toContain('href="#main-content"');
      expect(layoutHtml).toContain('id="main-content"');
      expect(layoutHtml).toContain('tabindex="-1"');
      expect(layoutHtml).toContain("Skip to main content");
      expect(layoutHtml).toContain('aria-label="Main Navigation"');
    });
  });
});
