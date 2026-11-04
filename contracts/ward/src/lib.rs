//! ward: children's trust whose money no single relative can move.
//! Design: ARCHITECTURE.md · Structure: project_structure.md · Tasks: ROADMAP.md.

use near_sdk::json_types::U128;
use near_sdk::store::{IterableMap, LookupMap};
use near_sdk::{env, near, AccountId, BorshStorageKey, PanicOnDefault, PromiseOrValue};

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

use types::{Request, RequestId, Trust, TrustId};

use crate::errors::E01_TRUST_NOT_FOUND;

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
        let _ = (sender_id, amount, msg);
        todo!("W-2.6: parse FtMessage → settlor::internal_deposit")
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
