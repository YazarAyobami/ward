import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatAmount, parseAmount } from "../src/format.js";

describe("format: formatAmount_cases", () => {
  it("formats amounts with decimals and symbols", () => {
    assert.equal(formatAmount(1_500_000n, 6, "tUSDC"), "1.5 tUSDC");
    assert.equal(formatAmount(10_000_000n, 6, "tUSDC"), "10 tUSDC");
    assert.equal(formatAmount(50n, 6), "0.00005");
    assert.equal(formatAmount(0n, 6, "tUSDC"), "0 tUSDC");
    assert.equal(formatAmount(100n, 0, "NEAR"), "100 NEAR");
    assert.equal(formatAmount(100n, 0), "100");
  });

  it("handles negative amounts and precision boundaries", () => {
    assert.equal(formatAmount(-2_500_000n, 6, "USD"), "-2.5 USD");
    assert.equal(formatAmount(1_000_001n, 6), "1.000001");
  });
});

describe("format: parseAmount_cases", () => {
  it("parses valid decimal strings into bigints", () => {
    assert.equal(parseAmount("1.5", 6), 1_500_000n);
    assert.equal(parseAmount("10", 6), 10_000_000n);
    assert.equal(parseAmount("0.00005", 6), 50n);
    assert.equal(parseAmount("0", 6), 0n);
    assert.equal(parseAmount("  25.75  ", 6), 25_750_000n);
    assert.equal(parseAmount("100", 0), 100n);
  });

  it("rejects invalid amount formats and overflow decimals", () => {
    assert.throws(() => parseAmount("", 6), /Amount cannot be empty/);
    assert.throws(() => parseAmount("abc", 6), /Invalid amount format/);
    assert.throws(() => parseAmount("1.2.3", 6), /Invalid amount format/);
    assert.throws(() => parseAmount("-5", 6), /Invalid amount format/);
    assert.throws(
      () => parseAmount("1.1234567", 6),
      /Fractional part \(7 digits\) exceeds allowed decimals \(6\)/
    );
  });
});
