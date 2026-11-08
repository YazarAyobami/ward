// Step logging with explorer links; exits non-zero on unexpected state (A-11.8).
import { explorerAccountUrl, explorerTxUrl, Network } from "@ward/core";

export const log = (msg: string): void => {
  console.log(msg);
};

export const step = (n: number, title: string): void => {
  console.log(`\n\x1b[36m▶ [Step ${n}] ${title}\x1b[0m`);
};

export const success = (msg: string): void => {
  console.log(`\x1b[32m✔ ${msg}\x1b[0m`);
};

export const fail = (msg: string): never => {
  console.error(`\x1b[31m✖ ${msg}\x1b[0m`);
  process.exit(1);
};

export const link = (
  label: string,
  id: string,
  type: "tx" | "account" = "account",
  network: Network = "testnet"
): void => {
  const url = type === "tx" ? explorerTxUrl(network, id) : explorerAccountUrl(network, id);
  console.log(`  🔗 ${label}: ${url}`);
};
