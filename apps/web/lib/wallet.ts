// wallet-selector setup for members and council (W-7.2, A-9.7).
import {
  setupWalletSelector,
  type WalletSelector,
  type NetworkId,
  type Action,
} from "@near-wallet-selector/core";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupHotWallet } from "@near-wallet-selector/hot-wallet";
import { setupModal, type WalletSelectorModal } from "@near-wallet-selector/modal-ui";

export interface WalletState {
  selector: WalletSelector;
  modal: WalletSelectorModal;
}

export interface SetupWalletOptions {
  networkId?: NetworkId;
  contractId?: string;
}

export interface SignAndSendParams {
  receiverId: string;
  actions: Action[];
}

let walletStatePromise: Promise<WalletState> | null = null;

export async function setupWallet(options?: SetupWalletOptions): Promise<WalletState> {
  if (typeof window === "undefined") {
    // Return SSR placeholder when running in node/SSR environments
    return {
      selector: {} as WalletSelector,
      modal: {} as WalletSelectorModal,
    };
  }

  if (!walletStatePromise) {
    walletStatePromise = (async () => {
      const network = options?.networkId || "testnet";
      const selector = await setupWalletSelector({
        network,
        modules: [
          setupMyNearWallet(),
          setupMeteorWallet(),
          setupHotWallet(),
        ],
      });

      const modal = setupModal(selector, {
        contractId: options?.contractId || "ward.testnet",
      });

      return { selector, modal };
    })();
  }

  return walletStatePromise;
}

export function getAccountId(selector: WalletSelector): string | null {
  if (!selector || !selector.store) return null;
  const state = selector.store.getState();
  return state.accounts.find((account) => account.active)?.accountId || null;
}

export async function signIn(modal?: WalletSelectorModal): Promise<void> {
  const m = modal ?? (await setupWallet()).modal;
  m.show();
}

export async function signOut(selector?: WalletSelector): Promise<void> {
  const s = selector ?? (await setupWallet()).selector;
  const wallet = await s.wallet();
  await wallet.signOut();
}

export async function signAndSend(
  params: SignAndSendParams,
  selector?: WalletSelector
): Promise<unknown> {
  const s = selector ?? (await setupWallet()).selector;
  const wallet = await s.wallet();
  return wallet.signAndSendTransaction({
    receiverId: params.receiverId,
    actions: params.actions,
  });
}
