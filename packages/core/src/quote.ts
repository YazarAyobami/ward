// 1Click dry-run funding quote (W-8.2, ARCHITECTURE §9). Display only.
// `dry: true` means 1Click creates no deposit address and tracks nothing.
// 1Click runs on mainnet only, so the quote prices real USDC on NEAR; the
// testnet trust itself holds mock tUSDC.
import { z } from "zod";

export const ONECLICK_QUOTE_URL = "https://1click.chaindefuser.com/v0/quote";

/** Mainnet USDC on NEAR: the asset a mainnet trust would hold. */
export const QUOTE_DESTINATION = {
  assetId: "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
  symbol: "USDC",
  chain: "NEAR",
  decimals: 6,
} as const;

export interface QuoteOrigin {
  id: string;
  label: string;
  assetId: string;
  symbol: string;
  chain: string;
  decimals: number;
  /**
   * 1Click validates `refundTo` as an address on the origin chain even for a dry run.
   * A dry run never moves funds, so this is a syntactically valid placeholder only.
   */
  refundPlaceholder: string;
}

export const QUOTE_ORIGINS: readonly QuoteOrigin[] = [
  {
    id: "tron-usdt",
    label: "USDT on Tron",
    assetId: "nep141:tron-d28a265909efecdcee7c5028585214ea0b96f015.omft.near",
    symbol: "USDT",
    chain: "Tron",
    decimals: 6,
    refundPlaceholder: "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb",
  },
  {
    id: "eth-usdt",
    label: "USDT on Ethereum",
    assetId: "nep141:eth-0xdac17f958d2ee523a2206206994597c13d831ec7.omft.near",
    symbol: "USDT",
    chain: "Ethereum",
    decimals: 6,
    refundPlaceholder: "0x1111111111111111111111111111111111111111",
  },
  {
    id: "base-usdc",
    label: "USDC on Base",
    assetId: "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
    symbol: "USDC",
    chain: "Base",
    decimals: 6,
    refundPlaceholder: "0x1111111111111111111111111111111111111111",
  },
];

/** 1Click requires an existing NEAR account as recipient; a dry run sends nothing to it. */
export const DRY_RUN_RECIPIENT = "intents.near";

const DEADLINE_MS = 60 * 60 * 1000;

export class QuoteError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "QuoteError";
  }
}

export function getQuoteOrigin(originId: string): QuoteOrigin {
  const origin = QUOTE_ORIGINS.find((o) => o.id === originId);
  if (!origin) {
    throw new QuoteError(`Unknown origin asset: ${originId}`);
  }
  return origin;
}

export interface DryQuoteParams {
  originId: string;
  /** Amount in the origin asset's base units. */
  amount: bigint;
  now?: Date;
}

/** Body for `POST /v0/quote`. `dry` is always true: this module can't request a live quote. */
export function buildDryQuoteRequest(params: DryQuoteParams): Record<string, unknown> {
  const origin = getQuoteOrigin(params.originId);
  if (params.amount <= 0n) {
    throw new QuoteError("Amount must be greater than zero");
  }
  const now = params.now ?? new Date();
  return {
    dry: true,
    swapType: "EXACT_INPUT",
    slippageTolerance: 100,
    originAsset: origin.assetId,
    depositType: "ORIGIN_CHAIN",
    destinationAsset: QUOTE_DESTINATION.assetId,
    amount: params.amount.toString(),
    refundTo: origin.refundPlaceholder,
    refundType: "ORIGIN_CHAIN",
    recipient: DRY_RUN_RECIPIENT,
    recipientType: "DESTINATION_CHAIN",
    deadline: new Date(now.getTime() + DEADLINE_MS).toISOString(),
    quoteWaitingTimeMs: 3000,
  };
}

const BaseUnits = z.string().regex(/^\d+$/);

export const OneClickQuoteResponse = z.object({
  quote: z.object({
    amountIn: BaseUnits,
    amountOut: BaseUnits,
    minAmountOut: BaseUnits,
    timeEstimate: z.number().nonnegative(),
  }),
  timestamp: z.string().optional(),
});

export interface DryQuote {
  origin: QuoteOrigin;
  amountIn: bigint;
  amountOut: bigint;
  minAmountOut: bigint;
  timeEstimateSeconds: number;
  /** When 1Click produced the quote (ISO 8601), if it said. */
  quotedAt: string | null;
}

export function parseDryQuote(origin: QuoteOrigin, json: unknown): DryQuote {
  const parsed = OneClickQuoteResponse.safeParse(json);
  if (!parsed.success) {
    throw new QuoteError("1Click returned a quote in an unexpected shape");
  }
  const { quote, timestamp } = parsed.data;
  return {
    origin,
    amountIn: BigInt(quote.amountIn),
    amountOut: BigInt(quote.amountOut),
    minAmountOut: BigInt(quote.minAmountOut),
    timeEstimateSeconds: quote.timeEstimate,
    quotedAt: timestamp ?? null,
  };
}

export interface FetchDryQuoteOptions {
  fetch?: typeof fetch;
  endpoint?: string;
}

/** Asks 1Click for a dry-run quote. Throws `QuoteError` with 1Click's own message on failure. */
export async function fetchDryQuote(
  params: DryQuoteParams,
  options: FetchDryQuoteOptions = {}
): Promise<DryQuote> {
  const origin = getQuoteOrigin(params.originId);
  const body = buildDryQuoteRequest(params);
  const doFetch = options.fetch ?? fetch;

  let res: Response;
  try {
    res = await doFetch(options.endpoint ?? ONECLICK_QUOTE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new QuoteError("Could not reach the 1Click quote service");
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // handled below: a non-JSON body is an error either way
  }

  if (!res.ok) {
    const message = z.object({ message: z.string() }).safeParse(json);
    throw new QuoteError(
      message.success ? message.data.message : `1Click quote failed (HTTP ${res.status})`,
      res.status
    );
  }
  return parseDryQuote(origin, json);
}
