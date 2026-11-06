import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { explorerAccountUrl, explorerTxUrl, getConfig, NETWORKS } from "../src/config.js";

describe("config: explorerTxUrl_cases", () => {
  it("builds testnet and mainnet transaction explorer URLs", () => {
    assert.equal(
      explorerTxUrl("testnet", "9AbCdEf123"),
      "https://testnet.nearblocks.io/txns/9AbCdEf123"
    );
    assert.equal(
      explorerTxUrl("mainnet", "8ZxYwV987"),
      "https://nearblocks.io/txns/8ZxYwV987"
    );
  });
});

describe("config: explorerAccountUrl_cases", () => {
  it("builds testnet and mainnet account explorer URLs", () => {
    assert.equal(
      explorerAccountUrl("testnet", "alice.testnet"),
      "https://testnet.nearblocks.io/address/alice.testnet"
    );
    assert.equal(
      explorerAccountUrl("mainnet", "bob.near"),
      "https://nearblocks.io/address/bob.near"
    );
  });
});

describe("config: network config retrieval", () => {
  it("returns network configuration with standard defaults", () => {
    const testnet = getConfig("testnet");
    assert.equal(testnet.network, "testnet");
    assert.equal(testnet.contractId, "ward.testnet");
    assert.equal(testnet.tokenDecimals, 6);

    const mainnet = getConfig("mainnet");
    assert.equal(mainnet.network, "mainnet");
    assert.equal(mainnet.contractId, "ward.near");
    assert.equal(mainnet.tokenDecimals, 6);

    assert.equal(getConfig(), NETWORKS.testnet);
  });
});
