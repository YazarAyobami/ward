// Amount and time formatting (W-6.4). Amounts are bigint; never JS number.

/**
 * Formats a raw bigint amount into a decimal string with optional currency symbol.
 * Strips unnecessary trailing fractional zeros while preserving significant digits.
 */
export function formatAmount(raw: bigint, decimals: number, symbol?: string): string {
  if (decimals === 0) {
    const base = raw.toString();
    return symbol ? `${base} ${symbol}` : base;
  }

  const factor = 10n ** BigInt(decimals);
  const isNegative = raw < 0n;
  const absRaw = isNegative ? -raw : raw;

  const intPart = absRaw / factor;
  const fracPart = absRaw % factor;

  let fracStr = fracPart.toString().padStart(decimals, "0");
  // Trim trailing zeros
  fracStr = fracStr.replace(/0+$/, "");

  const numStr = fracStr.length > 0 ? `${intPart}.${fracStr}` : intPart.toString();
  const signedStr = isNegative ? `-${numStr}` : numStr;

  return symbol ? `${signedStr} ${symbol}` : signedStr;
}

/**
 * Parses a decimal display string (e.g., "1.50") into a raw bigint given decimals.
 * Throws if the input format is invalid or has too many decimal places.
 */
export function parseAmount(display: string, decimals: number): bigint {
  const trimmed = display.trim();
  if (!trimmed) {
    throw new Error("Amount cannot be empty");
  }

  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Invalid amount format: ${display}`);
  }

  const parts = trimmed.split(".");
  const intPart = parts[0] ?? "0";
  const fracPart = parts[1] ?? "";

  if (fracPart.length > decimals) {
    throw new Error(
      `Fractional part (${fracPart.length} digits) exceeds allowed decimals (${decimals})`
    );
  }

  const paddedFrac = fracPart.padEnd(decimals, "0");
  const factor = 10n ** BigInt(decimals);

  return BigInt(intPart) * factor + (paddedFrac ? BigInt(paddedFrac) : 0n);
}
