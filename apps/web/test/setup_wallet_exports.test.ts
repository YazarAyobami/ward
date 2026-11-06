import { describe, it, expect } from "vitest";
import {
  setupWallet,
  signIn,
  signOut,
  signAndSend,
  getAccountId,
} from "../lib/wallet";

describe("setup_wallet_exports", () => {
  it("exports setupWallet function", () => {
    expect(typeof setupWallet).toBe("function");
  });

  it("exports signIn helper", () => {
    expect(typeof signIn).toBe("function");
  });

  it("exports signOut helper", () => {
    expect(typeof signOut).toBe("function");
  });

  it("exports signAndSend helper", () => {
    expect(typeof signAndSend).toBe("function");
  });

  it("exports getAccountId helper", () => {
    expect(typeof getAccountId).toBe("function");
  });

  it("setupWallet returns selector and modal placeholders outside browser", async () => {
    const res = await setupWallet();
    expect(res).toBeDefined();
    expect(typeof res.selector).toBe("object");
    expect(typeof res.modal).toBe("object");
  });
});
