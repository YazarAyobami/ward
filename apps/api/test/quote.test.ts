import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createQuoteRoute } from "../src/routes/quote.js";

function upstream(payload: unknown, status = 201) {
  const bodies: Record<string, unknown>[] = [];
  const impl = (async (_url: string | URL | Request, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return { ok: status < 300, status, json: async () => payload } as Response;
  }) as typeof fetch;
  return { impl, bodies };
}

function post(route: ReturnType<typeof createQuoteRoute>, body: string) {
  return route.request("/", { method: "POST", headers: { "content-type": "application/json" }, body });
}

const SAMPLE = {
  quote: { amountIn: "2000000000", amountOut: "1997708157", minAmountOut: "1977731075", timeEstimate: 80 },
  timestamp: "2026-11-11T00:36:35.096Z",
};

describe("api: POST /quote (W-8.2)", () => {
  it("proxies a dry-run quote and returns amounts as strings", async () => {
    const { impl, bodies } = upstream(SAMPLE);
    const res = await post(createQuoteRoute(impl), JSON.stringify({ origin: "tron-usdt", amount: "2000000000" }));
    assert.equal(res.status, 200);
    const json = (await res.json()) as Record<string, unknown>;
    assert.equal(json.dry, true);
    assert.equal(json.amount_in, "2000000000");
    assert.equal(json.amount_out, "1997708157");
    assert.equal(json.min_amount_out, "1977731075");
    assert.equal(json.time_estimate_seconds, 80);
    assert.equal(bodies.length, 1);
    assert.equal(bodies[0]?.dry, true);
  });

  it("rejects invalid input without calling 1Click", async () => {
    const { impl, bodies } = upstream(SAMPLE);
    const route = createQuoteRoute(impl);
    for (const bad of [
      "not json",
      JSON.stringify({}),
      JSON.stringify({ origin: "doge", amount: "1000000" }),
      JSON.stringify({ origin: "tron-usdt", amount: "12.5" }),
      JSON.stringify({ origin: "tron-usdt", amount: "0" }),
      JSON.stringify({ origin: "tron-usdt", amount: 1000000 }),
    ]) {
      const res = await post(route, bad);
      assert.equal(res.status, 400, bad);
    }
    assert.equal(bodies.length, 0);
  });

  it("returns 502 with 1Click's message when the quote fails", async () => {
    const { impl } = upstream({ message: "Temporary swap limits: minimum swap amount is $100" }, 400);
    const res = await post(createQuoteRoute(impl), JSON.stringify({ origin: "tron-usdt", amount: "1000000" }));
    assert.equal(res.status, 502);
    const json = (await res.json()) as { error: string };
    assert.match(json.error, /minimum swap amount/);
  });
});
