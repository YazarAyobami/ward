// Amount and time formatting (W-6.4). Amounts are bigint; never JS number.
export const formatAmount = (_raw: bigint, _decimals: number, _symbol: string): string => {
  throw new Error("not implemented: W-6.4");
};
export const parseAmount = (_display: string, _decimals: number): bigint => {
  throw new Error("not implemented: W-6.4");
};
