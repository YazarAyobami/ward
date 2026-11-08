import { DemoAccounts, loadAccounts } from "../lib/accounts.js";

export interface DemoContext {
  accounts: DemoAccounts;
  trustId: number;
  secondTrustId: number;
  tokenContract: string;
  wardContract: string;
}

export async function createDemoContext(): Promise<DemoContext> {
  const accounts = await loadAccounts();
  return {
    accounts,
    trustId: 0,
    secondTrustId: 1,
    tokenContract: accounts.tokenContract,
    wardContract: accounts.wardContract,
  };
}
