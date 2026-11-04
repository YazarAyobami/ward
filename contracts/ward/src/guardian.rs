//! Guardian actions. (W-3.1, W-2.9, W-3.6, W-3.7)

use near_sdk::{env, near, require};

use crate::access;
use crate::errors;
use crate::events::{self, WardEvent};
use crate::rules;
use crate::types::{Approval, CryptoHash, RequestId, TrustId};
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    /// 3 attestations (cross-circle by construction) → DeathClaimed.
    pub fn attest_death(&mut self, trust_id: TrustId, evidence_hash: CryptoHash) {
        let _ = (trust_id, evidence_hash);
        todo!("W-3.1")
    }

    /// Executes the request when its rule is met.
    pub fn approve(&mut self, request_id: RequestId) {
        let _ = request_id;
        todo!("W-3.6")
    }

    pub fn reject(&mut self, request_id: RequestId) {
        let _ = request_id;
        todo!("W-3.6")
    }

    /// Vetoes from 2 distinct circles cancel the pending withdrawal; one veto does not.
    pub fn veto_withdrawal(&mut self, trust_id: TrustId) {
        let mut trust = self.trust_or_panic(trust_id);
        let (guardian, circle) = access::assert_guardian(&trust);

        let Some(mut pending) = trust.pending_withdrawal.take() else {
            env::panic_str(errors::E34_NO_PENDING_WITHDRAWAL);
        };
        require!(
            !pending.vetoes.iter().any(|veto| veto.account == guardian),
            errors::E21_ALREADY_VOTED
        );

        pending.vetoes.push(Approval {
            account: guardian,
            circle,
        });

        if rules::distinct_circles(&pending.vetoes) >= 2 {
            events::emit(WardEvent::WithdrawalVetoed { trust_id });
        } else {
            trust.pending_withdrawal = Some(pending);
        }
        self.save_trust(trust);
    }

    /// Any single guardian. Unpause goes through an `Unpause` request.
    pub fn pause(&mut self, trust_id: TrustId) {
        let _ = trust_id;
        todo!("W-3.7")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{account, guardian, insert_trust, set_caller, trust};
    use crate::types::{Circle, PendingWithdrawal, TrustStatus};
    use near_sdk::json_types::{U128, U64};
    use near_sdk::test_utils::get_logs;

    fn trust_with_pending_withdrawal() -> crate::types::Trust {
        let mut trust = trust(0);
        trust.status = TrustStatus::Active;
        trust.pending_withdrawal = Some(PendingWithdrawal {
            amount: U128(100_000_000),
            requested_at: U64(0),
            execute_after: U64(crate::time::NS_PER_DAY),
            vetoes: Vec::new(),
        });
        trust
    }

    #[test]
    fn one_veto_does_not_cancel() {
        set_caller(account("aunt.near"));
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust_with_pending_withdrawal());

        contract.veto_withdrawal(0);

        let pending = contract
            .get_trust(0)
            .unwrap()
            .pending_withdrawal
            .expect("still pending");
        assert_eq!(pending.vetoes.len(), 1);
        assert!(!get_logs()
            .iter()
            .any(|log| log.contains("withdrawal_vetoed")));
    }

    #[test]
    fn vetoes_from_two_circles_cancel() {
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust_with_pending_withdrawal());

        set_caller(account("aunt.near"));
        contract.veto_withdrawal(0);
        set_caller(account("teacher.near"));
        contract.veto_withdrawal(0);

        assert!(contract.get_trust(0).unwrap().pending_withdrawal.is_none());
        assert!(get_logs()
            .iter()
            .any(|log| log.contains("withdrawal_vetoed")));
    }

    #[test]
    fn vetoes_from_one_circle_do_not_cancel() {
        let mut contract = Contract::new(None);
        let mut trust = trust_with_pending_withdrawal();
        trust.guardians = vec![
            guardian("aunt.near", Circle::Maternal),
            guardian("granny.near", Circle::Maternal),
            guardian("teacher.near", Circle::Institution),
            guardian("uncle.near", Circle::Paternal),
        ];
        insert_trust(&mut contract, trust);

        set_caller(account("aunt.near"));
        contract.veto_withdrawal(0);
        set_caller(account("granny.near"));
        contract.veto_withdrawal(0);

        assert!(contract.get_trust(0).unwrap().pending_withdrawal.is_some());
    }

    #[test]
    #[should_panic(expected = "E21_ALREADY_VOTED")]
    fn same_guardian_cannot_veto_twice() {
        set_caller(account("aunt.near"));
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust_with_pending_withdrawal());

        contract.veto_withdrawal(0);
        contract.veto_withdrawal(0);
    }

    #[test]
    #[should_panic(expected = "E03_NOT_GUARDIAN")]
    fn non_guardian_cannot_veto() {
        set_caller(account("stranger.near"));
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust_with_pending_withdrawal());
        contract.veto_withdrawal(0);
    }

    #[test]
    #[should_panic(expected = "E34_NO_PENDING_WITHDRAWAL")]
    fn veto_without_pending_withdrawal_panics() {
        set_caller(account("aunt.near"));
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust(0));
        contract.veto_withdrawal(0);
    }

    #[test]
    #[should_panic(expected = "E01_TRUST_NOT_FOUND")]
    fn veto_on_missing_trust_panics() {
        set_caller(account("aunt.near"));
        let mut contract = Contract::new(None);
        contract.veto_withdrawal(9);
    }
}
