// Network config + explorer URL builders (W-6.4).
export type Network = "testnet" | "mainnet";

export interface WardConfig {
  network: Network;
  rpcUrl: string;
  contractId: string;
  tokenDecimals: number;
}

export const explorerTxUrl = (_network: Network, _txHash: string): string => {
  throw new Error("not implemented: W-6.4");
};
export const explorerAccountUrl = (_network: Network, _accountId: string): string => {
  throw new Error("not implemented: W-6.4");
};
