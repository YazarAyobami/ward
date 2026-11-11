"use client";
// Any-chain funding quote on /t/[id]/fund (W-8.2). A real 1Click dry-run quote, display only.
import { useState } from "react";
import {
  fetchDryQuote,
  formatAmount,
  parseAmount,
  QUOTE_DESTINATION,
  QUOTE_ORIGINS,
  type DryQuote,
} from "@ward/core";

export type QuoteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; quote: DryQuote }
  | { status: "error"; message: string };

export function QuoteResult({ state, trustId }: { state: QuoteState; trustId: number }) {
  if (state.status === "idle") return null;

  if (state.status === "loading") {
    return (
      <p role="status" className="text-xs text-neutral-400">
        Asking 1Click for a quote…
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <div
        role="alert"
        data-testid="quote-error"
        className="p-3.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs"
      >
        No quote: {state.message}
      </div>
    );
  }

  const { quote } = state;
  const { origin } = quote;
  return (
    <div
      role="status"
      data-testid="quote-result"
      className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs"
    >
      <div className="flex justify-between gap-3 text-neutral-400">
        <span>You send:</span>
        <span className="text-neutral-200 font-mono text-right">
          {formatAmount(quote.amountIn, origin.decimals, origin.symbol)} on {origin.chain}
        </span>
      </div>
      <div className="flex justify-between gap-3 text-neutral-400">
        <span>Worst case after slippage (1%):</span>
        <span className="text-neutral-200 font-mono text-right">
          {formatAmount(quote.minAmountOut, QUOTE_DESTINATION.decimals, QUOTE_DESTINATION.symbol)}
        </span>
      </div>
      <div className="flex justify-between gap-3 text-neutral-400">
        <span>Estimated time:</span>
        <span className="text-neutral-200 font-mono text-right">~{quote.timeEstimateSeconds} seconds</span>
      </div>
      <div className="pt-2 border-t border-neutral-800 flex justify-between gap-3 font-bold text-neutral-100">
        <span>Trust #{trustId} would receive:</span>
        <span className="text-amber-300 font-mono text-right">
          {formatAmount(quote.amountOut, QUOTE_DESTINATION.decimals, QUOTE_DESTINATION.symbol)} on{" "}
          {QUOTE_DESTINATION.chain}
        </span>
      </div>
      <p className="pt-1 text-[11px] text-neutral-500">
        Live dry-run quote from NEAR Intents 1Click (mainnet prices). Nothing was sent and no deposit address
        was created. This testnet trust holds mock tUSDC, so this shows what any-chain funding would cost on
        mainnet.
      </p>
    </div>
  );
}

export function FundingQuote({ trustId, amount }: { trustId: number; amount: string }) {
  const [originId, setOriginId] = useState<string>(QUOTE_ORIGINS[0]?.id ?? "");
  const [state, setState] = useState<QuoteState>({ status: "idle" });
  const origin = QUOTE_ORIGINS.find((o) => o.id === originId);

  const handleQuote = async () => {
    if (!origin) return;
    let units: bigint;
    try {
      units = parseAmount(amount, origin.decimals);
    } catch {
      setState({ status: "error", message: "enter a valid amount first." });
      return;
    }
    setState({ status: "loading" });
    try {
      const quote = await fetchDryQuote({ originId: origin.id, amount: units });
      setState({ status: "ok", quote });
    } catch (err: unknown) {
      setState({ status: "error", message: err instanceof Error ? err.message : "quote failed." });
    }
  };

  return (
    <div className="pt-3 border-t border-neutral-800 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label htmlFor="quote-origin" className="block text-neutral-400 mb-1">
            Pay from
          </label>
          <select
            id="quote-origin"
            value={originId}
            onChange={(e) => {
              setOriginId(e.target.value);
              setState({ status: "idle" });
            }}
            className="w-full px-3 py-1.5 min-h-[44px] bg-neutral-950 border border-neutral-700 rounded text-neutral-200"
          >
            {QUOTE_ORIGINS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="block text-neutral-400 mb-1">Amount</span>
          <div className="px-3 py-1.5 min-h-[44px] flex items-center bg-neutral-950 border border-neutral-700 rounded text-neutral-200 font-mono">
            {amount || "0"} {origin?.symbol}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleQuote}
        disabled={state.status === "loading"}
        className="w-full py-2 px-3 min-h-[44px] rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 text-xs font-semibold transition-colors"
      >
        Get dry-run quote
      </button>

      <QuoteResult state={state} trustId={trustId} />
    </div>
  );
}
