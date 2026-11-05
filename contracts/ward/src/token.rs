//! NEP-141/145 promises + #[private] callbacks restoring state on failure. (W-2.10)

use near_sdk::json_types::{U128, U64};
use near_sdk::{env, ext_contract, near, AccountId, Gas, NearToken, Promise, PromiseError};

use crate::types::{AiReview, RequestId, RequestStatus, TrustId, TrustStatus};
use crate::{Contract, ContractExt};

/// Covers one NEP-145 registration. NEP-145 refunds any excess when `registration_only` is set.
pub(crate) const STORAGE_DEPOSIT: NearToken = NearToken::from_millinear(10);
/// Enough for one `ft_transfer` plus the token's own event log.
const FT_TRANSFER_GAS: Gas = Gas::from_tgas(30);
/// Enough to read the transfer result and restore state.
const ON_PAYOUT_GAS: Gas = Gas::from_tgas(15);

#[ext_contract(ext_ft)]
pub trait FungibleToken {
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>);
    fn storage_deposit(&mut self, account_id: Option<AccountId>, registration_only: Option<bool>);
}

#[ext_contract(ext_self)]
pub trait WardCallbacks {
    fn on_payout(&mut self, trust_id: TrustId, amount: U128, request_id: Option<RequestId>);
    fn on_allowance_payout(&mut self, trust_id: TrustId, amount: U128, previous_claim: U64);
    fn on_graduation_payout(&mut self, trust_id: TrustId, amount: U128, child: u8);
}

impl Contract {
    pub(crate) fn ft_transfer(
        &self,
        token: AccountId,
        receiver: AccountId,
        amount: U128,
    ) -> Promise {
        ext_ft::ext(token)
            .with_attached_deposit(NearToken::from_yoctonear(1))
            .with_static_gas(FT_TRANSFER_GAS)
            .ft_transfer(receiver, amount, None)
    }

    /// Registers `account` with the token, paid from this contract's NEAR balance.
    pub(crate) fn storage_deposit(&self, token: AccountId, account: AccountId) -> Promise {
        ext_ft::ext(token)
            .with_attached_deposit(STORAGE_DEPOSIT)
            .storage_deposit(Some(account), Some(true))
    }

    /// Pays `amount` and rolls the state back through `on_payout` if the transfer fails.
    pub(crate) fn payout(
        &self,
        token: AccountId,
        receiver: AccountId,
        amount: U128,
        trust_id: TrustId,
        request_id: Option<RequestId>,
    ) -> Promise {
        self.ft_transfer(token, receiver, amount).then(
            ext_self::ext(env::current_account_id())
                .with_static_gas(ON_PAYOUT_GAS)
                .on_payout(trust_id, amount, request_id),
        )
    }

    /// Allowance payout: on failure restores the balance and the claim clock.
    pub(crate) fn payout_allowance(
        &self,
        token: AccountId,
        receiver: AccountId,
        amount: U128,
        trust_id: TrustId,
        previous_claim: U64,
    ) -> Promise {
        self.ft_transfer(token, receiver, amount).then(
            ext_self::ext(env::current_account_id())
                .with_static_gas(ON_PAYOUT_GAS)
                .on_allowance_payout(trust_id, amount, previous_claim),
        )
    }

    /// Graduation payout: on failure restores the balance, `paid_out` and the tranche count.
    pub(crate) fn payout_graduation(
        &self,
        token: AccountId,
        receiver: AccountId,
        amount: U128,
        trust_id: TrustId,
        child: u8,
    ) -> Promise {
        self.ft_transfer(token, receiver, amount).then(
            ext_self::ext(env::current_account_id())
                .with_static_gas(ON_PAYOUT_GAS)
                .on_graduation_payout(trust_id, amount, child),
        )
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
        if result.is_err() {
            self.restore_payout(trust_id, amount, request_id);
        }
    }

    #[private]
    pub fn on_allowance_payout(
        &mut self,
        #[callback_result] result: Result<(), PromiseError>,
        trust_id: TrustId,
        amount: U128,
        previous_claim: U64,
    ) {
        if result.is_err() {
            let mut trust = self.trust_or_panic(trust_id);
            trust.balance = U128(trust.balance.0.saturating_add(amount.0));
            trust.allowance_claimed_until = previous_claim;
            self.save_trust(trust);
            env::log_str("allowance payout failed: state restored");
        }
    }

    #[private]
    pub fn on_graduation_payout(
        &mut self,
        #[callback_result] result: Result<(), PromiseError>,
        trust_id: TrustId,
        amount: U128,
        child: u8,
    ) {
        if result.is_err() {
            let mut trust = self.trust_or_panic(trust_id);
            trust.balance = U128(trust.balance.0.saturating_add(amount.0));
            if let Some(stored) = trust.children.get_mut(usize::from(child)) {
                stored.paid_out = U128(stored.paid_out.0.saturating_sub(amount.0));
                stored.tranches_paid = stored.tranches_paid.saturating_sub(1);
            }
            if trust.status == TrustStatus::Closed {
                trust.status = TrustStatus::Graduating;
            }
            self.save_trust(trust);
            env::log_str("graduation payout failed: state restored");
        }
    }
}

impl Contract {
    /// Undoes the state change made before a payout: credit the balance back and reopen the request.
    pub(crate) fn restore_payout(
        &mut self,
        trust_id: TrustId,
        amount: U128,
        request_id: Option<RequestId>,
    ) {
        let mut trust = self.trust_or_panic(trust_id);
        trust.balance = U128(trust.balance.0.saturating_add(amount.0));
        self.save_trust(trust);

        if let Some(request_id) = request_id {
            if let Some(mut request) = self.requests.get(&request_id).cloned() {
                request.status = RequestStatus::Pending;
                self.requests.insert(request_id, request);
            }
        }

        env::log_str("payout failed: state restored");
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
    use crate::test_utils::{account, insert_request, insert_trust, request, trust};
    use crate::types::{RequestKind, RequestStatus};
    use near_sdk::json_types::U64;
    use near_sdk::mock::{MockAction, Receipt};
    use near_sdk::test_utils::{get_created_receipts, VMContextBuilder};
    use near_sdk::testing_env;

    /// The contract calls itself for callbacks, so predecessor and current account coincide.
    fn contract() -> Contract {
        let context = VMContextBuilder::new()
            .current_account_id(account("ward.near"))
            .predecessor_account_id(account("ward.near"))
            .build();
        testing_env!(context);
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
        assert_eq!(calls[0].1, NearToken::from_yoctonear(1));
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

    #[test]
    fn payout_transfers_then_calls_back() {
        let contract = contract();
        let _ = contract.payout(
            account("tusdc.near"),
            account("settlor.near"),
            U128(10),
            0,
            None,
        );

        let receipts = get_created_receipts();
        let calls = function_calls(&receipts);
        let names: Vec<&str> = calls.iter().map(|(name, _)| name.as_str()).collect();
        assert!(names.contains(&"ft_transfer"));
        assert!(names.contains(&"on_payout"));
        assert!(receipts
            .iter()
            .any(|receipt| receipt.receiver_id == account("tusdc.near")));
        assert!(receipts
            .iter()
            .any(|receipt| receipt.receiver_id == near_sdk::env::current_account_id()));
    }

    #[test]
    fn on_payout_restores_balance_on_failure() {
        let mut contract = contract();
        let mut trust = trust(0);
        trust.balance = U128(500);
        insert_trust(&mut contract, trust);

        contract.restore_payout(0, U128(250), None);

        assert_eq!(contract.get_trust(0).unwrap().balance, U128(750));
    }

    #[test]
    fn on_payout_reopens_the_failed_request() {
        let mut contract = contract();
        insert_trust(&mut contract, trust(0));
        let mut request = request(0, RequestKind::Unpause);
        request.status = RequestStatus::Executed;
        insert_request(&mut contract, request);

        contract.on_payout(Err(PromiseError::Failed), 0, U128(5), Some(0));

        assert_eq!(
            contract.get_requests(0, None, None)[0].status,
            RequestStatus::Pending
        );
    }

    #[test]
    fn on_payout_success_leaves_state_alone() {
        let mut contract = contract();
        let mut trust = trust(0);
        trust.balance = U128(500);
        insert_trust(&mut contract, trust);

        contract.on_payout(Ok(()), 0, U128(250), None);

        assert_eq!(contract.get_trust(0).unwrap().balance, U128(500));
    }

    #[test]
    fn on_allowance_payout_restores_balance_and_clock() {
        let mut contract = contract();
        let mut trust = trust(0);
        trust.balance = U128(500);
        trust.allowance_claimed_until = U64(42);
        insert_trust(&mut contract, trust);

        contract.on_allowance_payout(Err(PromiseError::Failed), 0, U128(250), U64(7));

        let stored = contract.get_trust(0).unwrap();
        assert_eq!(stored.balance, U128(750));
        assert_eq!(stored.allowance_claimed_until, U64(7));
    }

    #[test]
    fn on_graduation_payout_restores_tranche_state() {
        let mut contract = contract();
        let mut trust = trust(0);
        trust.balance = U128(0);
        trust.status = TrustStatus::Closed;
        trust.children[0].paid_out = U128(1_000_000_000);
        trust.children[0].tranches_paid = 3;
        insert_trust(&mut contract, trust);

        contract.on_graduation_payout(Err(PromiseError::Failed), 0, U128(333_333_334), 0);

        let stored = contract.get_trust(0).unwrap();
        assert_eq!(stored.balance, U128(333_333_334));
        assert_eq!(stored.children[0].paid_out, U128(666_666_666));
        assert_eq!(stored.children[0].tranches_paid, 2);
        assert_eq!(stored.status, TrustStatus::Graduating);
    }
}
