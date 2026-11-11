import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildDryQuoteRequest,
  DRY_RUN_RECIPIENT,
  fetchDryQuote,
  getQuoteOrigin,
  ONECLICK_QUOTE_URL,
  parseDryQuote,
  QUOTE_DESTINATION,
  QUOTE_ORIGINS,
  QuoteError,
} from "../src/quote.js";

// Shape of a real 1Click `POST /v0/quote` dry-run response (2026-11-11), trimmed.
const SAMPLE_RESPONSE = {
  quote: {
    amountIn: "2000000000",
    amountInFormatted: "2000.0",
    amountOut: "1997708157",
    amountOutFormatted: "1997.708157",
    minAmountOut: "1977731075",
    timeEstimate: 80,
  },
  quoteRequest: { dry: true },
  timestamp: "2026-11-11T00:36:35.096Z",
};

function mockFetch(payload: unknown, status = 201) {
  const seen: { url: string; body: Record<string, unknown> }[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    seen.push({ url: String(url), body: JSON.parse(String(init?.body)) as Record<string, unknown> });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => payload,
    } as Response;
  }) as typeof fetch;
  return { impl, seen };
}

describe("quote: request builder (W-8.2)", () => {
  const now = new Date("2026-11-11T00:00:00.000Z");

  it("always builds a dry-run request", () => {
    for (const origin of QUOTE_ORIGINS) {
      const body = buildDryQuoteRequest({ originId: origin.id, amount: 2_000_000_000n, now });
      assert.equal(body.dry, true);
      assert.equal(body.originAsset, origin.assetId);
      assert.equal(body.refundTo, origin.refundPlaceholder);
    }
  });

  it("quotes exact input into USDC on NEAR with base-unit string amounts", () => {
    const body = buildDryQuoteRequest({ originId: "tron-usdt", amount: 2_000_000_000n, now });
    assert.equal(body.swapType, "EXACT_INPUT");
    assert.equal(body.destinationAsset, QUOTE_DESTINATION.assetId);
    assert.equal(body.amount, "2000000000");
    assert.equal(body.recipient, DRY_RUN_RECIPIENT);
    assert.equal(body.deadline, "2026-11-11T01:00:00.000Z");
  });

  it("rejects an unknown origin and a non-positive amount", () => {
    assert.throws(() => getQuoteOrigin("doge"), QuoteError);
    assert.throws(() => buildDryQuoteRequest({ originId: "tron-usdt", amount: 0n }), QuoteError);
    assert.throws(() => buildDryQuoteRequest({ originId: "tron-usdt", amount: -1n }), QuoteError);
  });
});

describe("quote: response parsing (W-8.2)", () => {
  it("parses amounts as bigint", () => {
    const quote = parseDryQuote(getQuoteOrigin("tron-usdt"), SAMPLE_RESPONSE);
    assert.equal(quote.amountIn, 2_000_000_000n);
    assert.equal(quote.amountOut, 1_997_708_157n);
    assert.equal(quote.minAmountOut, 1_977_731_075n);
    assert.equal(quote.timeEstimateSeconds, 80);
    assert.equal(quote.quotedAt, "2026-11-11T00:36:35.096Z");
  });

  it("rejects a response in the wrong shape", () => {
    const origin = getQuoteOrigin("tron-usdt");
    assert.throws(() => parseDryQuote(origin, {}), QuoteError);
    assert.throws(
      () => parseDryQuote(origin, { quote: { ...SAMPLE_RESPONSE.quote, amountOut: "12.5" } }),
      QuoteError
    );
  });
});

describe("quote: fetchDryQuote (W-8.2)", () => {
  it("posts a dry request to 1Click and returns the parsed quote", async () => {
    const { impl, seen } = mockFetch(SAMPLE_RESPONSE);
    const quote = await fetchDryQuote({ originId: "tron-usdt", amount: 2_000_000_000n }, { fetch: impl });
    assert.equal(seen.length, 1);
    assert.equal(seen[0]?.url, ONECLICK_QUOTE_URL);
    assert.equal(seen[0]?.body.dry, true);
    assert.equal(quote.amountOut, 1_997_708_157n);
  });

  it("surfaces 1Click's own error message", async () => {
    const { impl } = mockFetch({ message: "Temporary swap limits: minimum swap amount is $100" }, 400);
    await assert.rejects(
      fetchDryQuote({ originId: "tron-usdt", amount: 1n }, { fetch: impl }),
      (err: unknown) =>
        err instanceof QuoteError && err.status === 400 && /minimum swap amount/.test(err.message)
    );
  });

  it("reports a network failure and an unreadable error body as QuoteError", async () => {
    const failing = (async () => {
      throw new Error("offline");
    }) as typeof fetch;
    await assert.rejects(
      fetchDryQuote({ originId: "tron-usdt", amount: 1_000_000n }, { fetch: failing }),
      /Could not reach/
    );
    const { impl } = mockFetch(null, 502);
    await assert.rejects(
      fetchDryQuote({ originId: "tron-usdt", amount: 1_000_000n }, { fetch: impl }),
      /HTTP 502/
    );
  });
});
