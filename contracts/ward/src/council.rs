//! DAO-only membership changes. The DAO never moves money (invariant 2). (W-4.1)

use near_sdk::{env, near, require, AccountId, Promise};

use crate::access;
use crate::errors;
use crate::events::{self, WardEvent};
use crate::rules::validate_guardians;
use crate::token::STORAGE_DEPOSIT;
use crate::types::{Circle, Guardian, Payee, TrustId};
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    /// Re-validates ≤2 per circle / ≥2 circles.
    pub fn council_replace_guardian(&mut self, trust_id: TrustId, old: AccountId, new: Guardian) {
        let mut trust = self.trust_or_panic(trust_id);
        access::assert_dao(&trust);

        let pos = trust
            .guardians
            .iter()
            .position(|g| g.account == old)
            .unwrap_or_else(|| env::panic_str(errors::E03_NOT_GUARDIAN));

        trust.guardians[pos] = new.clone();
        validate_guardians(&trust.guardians, &trust.caregiver)
            .unwrap_or_else(|error| env::panic_str(error));

        self.save_trust(trust);
        self.index_account(&new.account, trust_id);

        events::emit(WardEvent::GuardianReplaced {
            trust_id,
            old,
            new: new.account,
        });
    }

    pub fn council_set_caregiver(&mut self, trust_id: TrustId, account: AccountId, circle: Circle) {
        let mut trust = self.trust_or_panic(trust_id);
        access::assert_dao(&trust);

        validate_guardians(&trust.guardians, &account)
            .unwrap_or_else(|error| env::panic_str(error));

        trust.caregiver = account.clone();
        trust.caregiver_circle = circle;

        self.save_trust(trust);
        self.index_account(&account, trust_id);

        events::emit(WardEvent::CaregiverChanged {
            trust_id,
            caregiver: account,
        });
    }

    /// Calls storage_deposit from ops_balance.
    pub fn council_add_payee(&mut self, trust_id: TrustId, payee: Payee) -> Promise {
        let mut trust = self.trust_or_panic(trust_id);
        access::assert_dao(&trust);

        require!(
            trust.ops_balance >= STORAGE_DEPOSIT,
            errors::E39_INSUFFICIENT_OPS_BALANCE
        );

        trust.ops_balance = trust.ops_balance.saturating_sub(STORAGE_DEPOSIT);
        trust.payees.push(payee.clone());
        let token = trust.token.clone();
        let payee_account = payee.account.clone();

        self.save_trust(trust);

        events::emit(WardEvent::PayeeAdded {
            trust_id,
            payee: payee_account.clone(),
        });

        self.storage_deposit(token, payee_account)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{account, guardian, insert_trust, set_caller, trust};
    use crate::types::PayeeKind;
    use near_sdk::test_utils::{get_created_receipts, get_logs};
    use near_sdk::NearToken;

    #[test]
    fn council_replace_guardian_works_for_dao() {
        set_caller(account("dao.near"));
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust(0));

        let replacement = guardian("new_aunt.near", Circle::Maternal);
        contract.council_replace_guardian(0, account("aunt.near"), replacement.clone());

        let updated = contract.get_trust(0).unwrap();
        assert!(updated.guardians.contains(&replacement));
        assert!(!updated
            .guardians
            .iter()
            .any(|g| g.account == account("aunt.near")));
        assert!(contract
            .get_trusts_for(account("new_aunt.near"))
            .iter()
            .any(|t| t.id == 0));
        assert!(get_logs()
            .iter()
            .any(|log| log.contains("\"guardian_replaced\"")));
    }

    #[test]
    #[should_panic(expected = "E06_NOT_DAO")]
    fn council_replace_guardian_rejects_non_dao() {
        set_caller(account("stranger.near"));
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust(0));

        contract.council_replace_guardian(
            0,
            account("aunt.near"),
            guardian("new_aunt.near", Circle::Maternal),
        );
    }

    #[test]
    #[should_panic(expected = "E08_CIRCLE_LIMIT")]
    fn council_replace_guardian_rejects_breaking_circle_limit() {
        set_caller(account("dao.near"));
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust(0));

        // Adding a 2nd Maternal when there are already Aunt (Maternal) and replacing Pastor (Community)
        // Wait, trust(0) has: aunt (Maternal), uncle (Paternal), teacher (Institution), pastor (Community).
        // If we replace pastor with a 2nd Maternal, that's 2 Maternal (allowed).
        // Let's add a 3rd Maternal: first replace uncle with maternal2, then teacher with maternal3.
        contract.council_replace_guardian(
            0,
            account("uncle.near"),
            guardian("maternal2.near", Circle::Maternal),
        );
        // Now aunt.near (Maternal), maternal2.near (Maternal).
        // Replacing teacher.near (Institution) with maternal3 (Maternal) makes 3 in Maternal circle -> panic E08.
        contract.council_replace_guardian(
            0,
            account("teacher.near"),
            guardian("maternal3.near", Circle::Maternal),
        );
    }

    #[test]
    #[should_panic(expected = "E03_NOT_GUARDIAN")]
    fn council_replace_guardian_rejects_unknown_guardian() {
        set_caller(account("dao.near"));
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust(0));

        contract.council_replace_guardian(
            0,
            account("nonexistent.near"),
            guardian("new_guardian.near", Circle::Maternal),
        );
    }

    #[test]
    fn council_set_caregiver_works_for_dao() {
        set_caller(account("dao.near"));
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust(0));

        contract.council_set_caregiver(0, account("new_caregiver.near"), Circle::Community);

        let updated = contract.get_trust(0).unwrap();
        assert_eq!(updated.caregiver, account("new_caregiver.near"));
        assert_eq!(updated.caregiver_circle, Circle::Community);
        assert!(contract
            .get_trusts_for(account("new_caregiver.near"))
            .iter()
            .any(|t| t.id == 0));
        assert!(get_logs()
            .iter()
            .any(|log| log.contains("\"caregiver_changed\"")));
    }

    #[test]
    #[should_panic(expected = "E06_NOT_DAO")]
    fn council_set_caregiver_rejects_non_dao() {
        set_caller(account("settlor.near"));
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust(0));

        contract.council_set_caregiver(0, account("new_caregiver.near"), Circle::Community);
    }

    #[test]
    #[should_panic(expected = "E11_CAREGIVER_IS_GUARDIAN")]
    fn council_set_caregiver_rejects_existing_guardian() {
        set_caller(account("dao.near"));
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust(0));

        // aunt.near is an existing guardian
        contract.council_set_caregiver(0, account("aunt.near"), Circle::Maternal);
    }

    #[test]
    fn council_add_payee_works_for_dao() {
        set_caller(account("dao.near"));
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust(0));

        let initial_ops = contract.get_trust(0).unwrap().ops_balance;
        let new_payee = Payee {
            account: account("pharmacy.near"),
            label: "Pharmacy".to_string(),
            kind: PayeeKind::Other,
        };

        let _ = contract.council_add_payee(0, new_payee.clone());

        let updated = contract.get_trust(0).unwrap();
        assert!(updated.payees.contains(&new_payee));
        assert_eq!(
            updated.ops_balance,
            initial_ops.saturating_sub(STORAGE_DEPOSIT)
        );

        let receipts = get_created_receipts();
        assert_eq!(receipts.len(), 1);
        assert_eq!(receipts[0].receiver_id, account("tusdc.near"));
        assert!(get_logs().iter().any(|log| log.contains("\"payee_added\"")));
    }

    #[test]
    #[should_panic(expected = "E06_NOT_DAO")]
    fn council_add_payee_rejects_non_dao() {
        set_caller(account("caregiver.near"));
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust(0));

        let new_payee = Payee {
            account: account("pharmacy.near"),
            label: "Pharmacy".to_string(),
            kind: PayeeKind::Other,
        };
        let _ = contract.council_add_payee(0, new_payee);
    }

    #[test]
    #[should_panic(expected = "E39_INSUFFICIENT_OPS_BALANCE")]
    fn council_add_payee_rejects_insufficient_ops_balance() {
        set_caller(account("dao.near"));
        let mut contract = Contract::new(None);
        let mut t = trust(0);
        t.ops_balance = NearToken::from_yoctonear(0);
        insert_trust(&mut contract, t);

        let new_payee = Payee {
            account: account("pharmacy.near"),
            label: "Pharmacy".to_string(),
            kind: PayeeKind::Other,
        };
        let _ = contract.council_add_payee(0, new_payee);
    }
}
