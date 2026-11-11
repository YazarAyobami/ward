import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { getQuoteOrigin, type DryQuote } from "@ward/core";
import { FundingQuote, QuoteResult } from "../components/FundingQuote";

const quote: DryQuote = {
  origin: getQuoteOrigin("tron-usdt"),
  amountIn: 2_000_000_000n,
  amountOut: 1_997_708_157n,
  minAmountOut: 1_977_731_075n,
  timeEstimateSeconds: 80,
  quotedAt: "2026-11-11T00:36:35.096Z",
};

describe("FundingQuote (W-8.2)", () => {
  it("shows the quote: amount in, amount out, worst case and time", () => {
    const html = renderToString(<QuoteResult state={{ status: "ok", quote }} trustId={0} />);
    expect(html).toContain('data-testid="quote-result"');
    expect(html).toContain("2000 USDT");
    expect(html).toContain("Tron");
    expect(html).toContain("1997.708157 USDC");
    expect(html).toContain("1977.731075 USDC");
    expect(html).toContain("80");
  });

  it("says plainly that the quote is a dry run and nothing was sent", () => {
    const html = renderToString(<QuoteResult state={{ status: "ok", quote }} trustId={0} />);
    expect(html).toContain("dry-run quote");
    expect(html).toContain("Nothing was sent");
    expect(html).toContain("mock tUSDC");
  });

  it("shows 1Click's error instead of a made-up quote", () => {
    const html = renderToString(
      <QuoteResult state={{ status: "error", message: "minimum swap amount is $100" }} trustId={0} />
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("minimum swap amount is $100");
    expect(html).not.toContain('data-testid="quote-result"');
  });

  it("renders nothing before a quote is requested", () => {
    expect(renderToString(<QuoteResult state={{ status: "idle" }} trustId={0} />)).toBe("");
  });

  it("offers the supported origin assets and a labelled 44px quote button", () => {
    const html = renderToString(<FundingQuote trustId={0} amount="2000" />);
    expect(html).toContain("USDT on Tron");
    expect(html).toContain("USDT on Ethereum");
    expect(html).toContain("USDC on Base");
    expect(html).toContain("Get dry-run quote");
    expect(html).toContain("min-h-[44px]");
    expect(html).toContain('for="quote-origin"');
  });
});
