// POST / — 1Click /v0/quote dry:true (W-8.2). Display only; nothing is stored or tracked.
import { Hono } from "hono";
import { z } from "zod";
import { fetchDryQuote, QUOTE_DESTINATION, QUOTE_ORIGINS, QuoteError } from "@ward/core";

const QuoteInput = z.object({
  origin: z.enum(QUOTE_ORIGINS.map((o) => o.id) as [string, ...string[]]),
  // Base units of the origin asset, as a decimal string (never a JS number).
  amount: z.string().regex(/^[1-9]\d{0,38}$/),
});

export function createQuoteRoute(fetchImpl: typeof fetch = fetch): Hono {
  const route = new Hono();

  route.post("/", async (c) => {
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: "body must be JSON" }, 400);
    }
    const input = QuoteInput.safeParse(raw);
    if (!input.success) {
      return c.json({ error: "invalid input: expected { origin, amount } with amount in base units" }, 400);
    }

    try {
      const quote = await fetchDryQuote(
        { originId: input.data.origin, amount: BigInt(input.data.amount) },
        { fetch: fetchImpl }
      );
      return c.json({
        dry: true,
        origin: { id: quote.origin.id, label: quote.origin.label, decimals: quote.origin.decimals },
        destination: QUOTE_DESTINATION,
        amount_in: quote.amountIn.toString(),
        amount_out: quote.amountOut.toString(),
        min_amount_out: quote.minAmountOut.toString(),
        time_estimate_seconds: quote.timeEstimateSeconds,
        quoted_at: quote.quotedAt,
      });
    } catch (err) {
      const message = err instanceof QuoteError ? err.message : "quote failed";
      return c.json({ error: message }, 502);
    }
  });

  return route;
}

export const quote = createQuoteRoute();
