//! Sandbox harness (W-1.6): a near-workspaces sandbox with ward and the tUSDC mock token
//! deployed and initialised, plus helpers for accounts, minting, and token storage.
//! Build the wasm first: `pnpm build:contract`.
#![allow(dead_code)]

use near_workspaces::network::Sandbox;
use near_workspaces::types::NearToken;
use near_workspaces::{Account, Contract, Worker};
use serde_json::json;

pub const WARD_WASM: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../target/near/ward/ward.wasm"
);
pub const FT_WASM: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../target/near/mock_ft/mock_ft.wasm"
);
pub const SPUTNIK_WASM: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/res/sputnikdao2.wasm");

/// 1 tUSDC in raw units (6 decimals).
pub const TUSDC: u128 = 1_000_000;
pub const NS_PER_SECOND: u64 = 1_000_000_000;
pub const NS_PER_DAY: u64 = 86_400 * NS_PER_SECOND;
pub const NS_PER_MONTH: u64 = 30 * NS_PER_DAY;

pub struct Env {
    pub worker: Worker<Sandbox>,
    pub ward: Contract,
    pub token: Contract,
}

fn read(path: &str) -> Vec<u8> {
    std::fs::read(path)
        .unwrap_or_else(|_| panic!("{path} missing: run `pnpm build:contract` first"))
}

/// Starts a sandbox, deploys ward (`new({ai_reviewer: null})`) and mock-ft (`new()`),
/// and registers ward with the token so it can receive deposits.
pub async fn setup() -> Env {
    let worker = near_workspaces::sandbox().await.expect("start sandbox");
    let ward = worker
        .dev_deploy(&read(WARD_WASM))
        .await
        .expect("deploy ward");
    let r = ward
        .call("new")
        .args_json(json!({ "ai_reviewer": null }))
        .transact()
        .await
        .expect("ward new");
    assert!(r.is_success(), "ward new() failed: {:?}", r.failures());

    let token = worker
        .dev_deploy(&read(FT_WASM))
        .await
        .expect("deploy mock-ft");
    let r = token.call("new").transact().await.expect("token new");
    assert!(r.is_success(), "mock-ft new() failed: {:?}", r.failures());

    let env = Env {
        worker,
        ward,
        token,
    };
    env.register_storage(env.ward.as_account()).await;
    env
}

impl Env {
    /// Creates a funded sandbox account (10 NEAR) under the root account.
    pub async fn user(&self, name: &str) -> Account {
        self.worker
            .root_account()
            .expect("root account")
            .create_subaccount(name)
            .initial_balance(NearToken::from_near(10))
            .transact()
            .await
            .expect("create subaccount")
            .into_result()
            .expect("subaccount created")
    }

    /// Registers `account` with the token (NEP-145), paying the minimum storage deposit.
    pub async fn register_storage(&self, account: &Account) {
        let r = account
            .call(self.token.id(), "storage_deposit")
            .args_json(json!({ "account_id": account.id(), "registration_only": true }))
            .deposit(NearToken::from_millinear(125))
            .transact()
            .await
            .expect("storage_deposit");
        assert!(r.is_success(), "storage_deposit failed: {:?}", r.failures());
    }

    /// Mints `amount` raw tUSDC to `account` (open mint on the mock token).
    pub async fn mint(&self, account: &Account, amount: u128) {
        let r = self
            .token
            .call("mint")
            .args_json(json!({ "account_id": account.id(), "amount": amount.to_string() }))
            .transact()
            .await
            .expect("mint");
        assert!(r.is_success(), "mint failed: {:?}", r.failures());
    }

    /// Reads the token balance of `account`.
    pub async fn balance(&self, account: &Account) -> u128 {
        let v: String = self
            .token
            .view("ft_balance_of")
            .args_json(json!({ "account_id": account.id() }))
            .await
            .expect("ft_balance_of")
            .json()
            .expect("balance json");
        v.parse().expect("u128 balance")
    }

    /// Default trust rules JSON for testing.
    pub fn default_rules(&self) -> serde_json::Value {
        json!({
            "allowance_amount": (150 * TUSDC).to_string(),
            "allowance_period": NS_PER_MONTH.to_string(),
            "large_threshold": (100 * TUSDC).to_string(),
            "death_quorum": 3,
            "waiting_period": NS_PER_MONTH.to_string(),
            "withdraw_free_cap": (50 * TUSDC).to_string(),
            "withdraw_delay": NS_PER_DAY.to_string(),
            "cancel_window": NS_PER_DAY.to_string(),
            "graduation_tranches": 3,
            "max_open_requests": 5,
            "flag_age_years": 14,
            "majority_age_years": 18,
            "fallback": ["fallback.near"],
            "time_scale": 1
        })
    }
}
