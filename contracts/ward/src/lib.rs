//! ward: children's trust whose money no single relative can move.
//! Design: ARCHITECTURE.md · Structure: project_structure.md · Tasks: ROADMAP.md.

use near_sdk::json_types::U128;
use near_sdk::store::{IterableMap, LookupMap};
use near_sdk::{env, near, require, AccountId, BorshStorageKey, PanicOnDefault, PromiseOrValue};

pub mod access;
pub mod caregiver;
pub mod child;
pub mod council;
pub mod errors;
pub mod events;
pub mod guardian;
pub mod requests;
pub mod rules;
pub mod settlor;
pub mod time;
pub mod token;
pub mod trust;
pub mod types;
pub mod views;

#[cfg(test)]
mod test_utils;

use types::{FtMessage, Request, RequestId, Trust, TrustId};

use crate::errors::{E01_TRUST_NOT_FOUND, E24_WRONG_TOKEN, E28_INVALID_MESSAGE};

#[near(serializers = [borsh])]
#[derive(BorshStorageKey)]
pub enum StorageKey {
    Trusts,
    Requests,
    ByAccount,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    pub(crate) trusts: IterableMap<TrustId, Trust>,
    pub(crate) requests: IterableMap<RequestId, Request>,
    /// Index for the UI: every trust an account is involved in.
    pub(crate) by_account: LookupMap<AccountId, Vec<TrustId>>,
    /// Account allowed to call `post_ai_review` (Could).
    pub(crate) ai_reviewer: Option<AccountId>,
    pub(crate) next_trust_id: TrustId,
    pub(crate) next_request_id: RequestId,
}

#[near]
impl Contract {
    #[init]
    pub fn new(ai_reviewer: Option<AccountId>) -> Self {
        Self {
            trusts: IterableMap::new(StorageKey::Trusts),
            requests: IterableMap::new(StorageKey::Requests),
            by_account: LookupMap::new(StorageKey::ByAccount),
            ai_reviewer,
            next_trust_id: 0,
            next_request_id: 0,
        }
    }

    /// NEP-141 receiver. `msg` = `{"deposit": trust_id}`. Accepts only `trust.token`.
    pub fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> PromiseOrValue<U128> {
        let trust_id = match near_sdk::serde_json::from_str::<FtMessage>(&msg) {
            Ok(FtMessage::Deposit(trust_id)) => trust_id,
            Err(_) => env::panic_str(E28_INVALID_MESSAGE),
        };
        let trust = self.trust_or_panic(trust_id);
        require!(
            env::predecessor_account_id() == trust.token,
            E24_WRONG_TOKEN
        );

        self.internal_deposit(trust_id, sender_id, amount);
        PromiseOrValue::Value(U128(0))
    }
}

impl Contract {
    pub(crate) fn trust_or_panic(&self, trust_id: TrustId) -> Trust {
        self.trusts
            .get(&trust_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E01_TRUST_NOT_FOUND))
    }

    pub(crate) fn save_trust(&mut self, trust: Trust) {
        self.trusts.insert(trust.id, trust);
    }

    /// Adds `trust_id` to the account's index once.
    pub(crate) fn index_account(&mut self, account: &AccountId, trust_id: TrustId) {
        let mut ids = self.by_account.get(account).cloned().unwrap_or_default();
        if !ids.contains(&trust_id) {
            ids.push(trust_id);
            self.by_account.insert(account.clone(), ids);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{account, insert_trust, trust};
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn env_with(predecessor: &str) {
        testing_env!(VMContextBuilder::new()
            .predecessor_account_id(account(predecessor))
            .build());
    }

    #[test]
    fn ft_on_transfer_accepts_the_trust_token() {
        env_with("tusdc.near");
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust(0));

        let result = contract.ft_on_transfer(
            account("settlor.near"),
            U128(500),
            r#"{"deposit":0}"#.to_string(),
        );

        assert!(matches!(result, PromiseOrValue::Value(U128(0))));
        assert_eq!(contract.get_trust(0).unwrap().balance, U128(2_000_000_500));
    }

    #[test]
    #[should_panic(expected = "E24_WRONG_TOKEN")]
    fn ft_on_transfer_rejects_wrong_token() {
        env_with("fake.near");
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust(0));
        let _ = contract.ft_on_transfer(
            account("settlor.near"),
            U128(500),
            r#"{"deposit":0}"#.to_string(),
        );
    }

    #[test]
    #[should_panic(expected = "E28_INVALID_MESSAGE")]
    fn ft_on_transfer_rejects_malformed_message() {
        env_with("tusdc.near");
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust(0));
        let _ = contract.ft_on_transfer(account("settlor.near"), U128(500), "not-json".to_string());
    }

    #[test]
    #[should_panic(expected = "E01_TRUST_NOT_FOUND")]
    fn ft_on_transfer_rejects_unknown_trust() {
        env_with("tusdc.near");
        let mut contract = Contract::new(None);
        let _ = contract.ft_on_transfer(
            account("settlor.near"),
            U128(500),
            r#"{"deposit":9}"#.to_string(),
        );
    }
}
