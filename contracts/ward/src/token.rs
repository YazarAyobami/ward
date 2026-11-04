//! NEP-141/145 promises + #[private] callbacks restoring state on failure. (W-2.10)

use near_sdk::json_types::U128;
use near_sdk::{ext_contract, near, AccountId, Gas, NearToken, Promise, PromiseError};

use crate::types::{AiReview, RequestId, TrustId};
use crate::{Contract, ContractExt};

/// Covers one NEP-145 registration. NEP-145 refunds any excess when `registration_only` is set.
pub(crate) const STORAGE_DEPOSIT: NearToken = NearToken::from_millinear(10);
/// Enough for one `ft_transfer` plus the token's own event log.
const FT_TRANSFER_GAS: Gas = Gas::from_tgas(30);

#[ext_contract(ext_ft)]
pub trait FungibleToken {
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>);
    fn storage_deposit(&mut self, account_id: Option<AccountId>, registration_only: Option<bool>);
}

impl Contract {
    pub(crate) fn ft_transfer(
        &self,
        token: AccountId,
        receiver: AccountId,
        amount: U128,
    ) -> Promise {
        ext_ft::ext(token)
            .with_static_gas(FT_TRANSFER_GAS)
            .ft_transfer(receiver, amount, None)
    }

    /// Registers `account` with the token, paid from this contract's NEAR balance.
    pub(crate) fn storage_deposit(&self, token: AccountId, account: AccountId) -> Promise {
        ext_ft::ext(token)
            .with_attached_deposit(STORAGE_DEPOSIT)
            .storage_deposit(Some(account), Some(true))
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
        todo!("W-2.10 wave 2: restore balance (+ request status) on failure")
    }

    /// Could. Only `ai_reviewer` (E27). Advisory only.
    pub fn post_ai_review(&mut self, request_id: RequestId, review: AiReview) {
        let _ = (request_id, review);
        todo!("W-8.1")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{account, set_caller};
    use near_sdk::mock::{MockAction, Receipt};
    use near_sdk::test_utils::get_created_receipts;

    fn contract() -> Contract {
        set_caller(account("settlor.near"));
        Contract::new(None)
    }

    fn function_calls(receipts: &[Receipt]) -> Vec<(String, NearToken)> {
        receipts
            .iter()
            .flat_map(|receipt| receipt.actions.iter())
            .filter_map(|action| match action {
                MockAction::FunctionCallWeight {
                    method_name,
                    attached_deposit,
                    ..
                } => Some((
                    String::from_utf8(method_name.clone()).expect("utf-8 method"),
                    *attached_deposit,
                )),
                _ => None,
            })
            .collect()
    }

    #[test]
    fn ft_transfer_targets_the_trust_token() {
        let contract = contract();
        let _ = contract.ft_transfer(account("tusdc.near"), account("school.near"), U128(1_000));

        let receipts = get_created_receipts();
        assert_eq!(receipts.len(), 1);
        assert_eq!(receipts[0].receiver_id, account("tusdc.near"));

        let calls = function_calls(&receipts);
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].0, "ft_transfer");
        assert_eq!(calls[0].1, NearToken::from_yoctonear(0));
    }

    #[test]
    fn storage_deposit_attaches_near_for_registration() {
        let contract = contract();
        let _ = contract.storage_deposit(account("tusdc.near"), account("school.near"));

        let receipts = get_created_receipts();
        assert_eq!(receipts.len(), 1);
        assert_eq!(receipts[0].receiver_id, account("tusdc.near"));

        let calls = function_calls(&receipts);
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].0, "storage_deposit");
        assert!(
            calls[0].1 >= NearToken::from_millinear(1),
            "attached {}",
            calls[0].1
        );
    }
}
