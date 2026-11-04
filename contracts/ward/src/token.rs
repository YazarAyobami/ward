//! NEP-141/145 promises + #[private] callbacks restoring state on failure. (W-2.10)

use near_sdk::json_types::U128;
use near_sdk::{near, AccountId, Promise, PromiseError};

use crate::types::{AiReview, RequestId, TrustId};
use crate::{Contract, ContractExt};

impl Contract {
    pub(crate) fn ft_transfer(&self, token: AccountId, receiver: AccountId, amount: U128) -> Promise {
        let _ = (token, receiver, amount);
        todo!("W-2.10")
    }
    pub(crate) fn storage_deposit(&self, token: AccountId, account: AccountId) -> Promise {
        let _ = (token, account);
        todo!("W-2.10")
    }
}

#[near]
impl Contract {
    #[private]
    pub fn on_payout(
        &mut self,
        #[callback_result] result: Result<(), PromiseError>,
        trust_id: TrustId,
        amount: U128,
        request_id: Option<RequestId>,
    ) {
        let _ = (result, trust_id, amount, request_id);
        todo!("W-2.10: restore balance (+ request status) on failure")
    }

    /// Could. Only `ai_reviewer` (E27). Advisory only.
    pub fn post_ai_review(&mut self, request_id: RequestId, review: AiReview) {
        let _ = (request_id, review);
        todo!("W-8.1")
    }
}
