// Network config + explorer URL builders (W-6.4).
export type Network = "testnet" | "mainnet";

export interface WardConfig {
  network: Network;
  rpcUrl: string;
  contractId: string;
  tokenDecimals: number;
}

export const NETWORKS: Record<Network, WardConfig> = {
  testnet: {
    network: "testnet",
    rpcUrl: "https://rpc.testnet.near.org",
    contractId: "ward.testnet",
    tokenDecimals: 6,
  },
  mainnet: {
    network: "mainnet",
    rpcUrl: "https://rpc.mainnet.near.org",
    contractId: "ward.near",
    tokenDecimals: 6,
  },
};

export function getConfig(network: Network = "testnet"): WardConfig {
  return NETWORKS[network];
}

/**
 * Returns the NearBlocks explorer URL for a transaction hash.
 */
export function explorerTxUrl(network: Network, txHash: string): string {
  const base = network === "testnet" ? "https://testnet.nearblocks.io" : "https://nearblocks.io";
  return `${base}/txns/${txHash}`;
}

/**
 * Returns the NearBlocks explorer URL for an account ID.
 */
export function explorerAccountUrl(network: Network, accountId: string): string {
  const base = network === "testnet" ? "https://testnet.nearblocks.io" : "https://nearblocks.io";
  return `${base}/address/${accountId}`;
}
