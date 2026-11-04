//! Trust creation and lifecycle. (W-2.6, W-3.3)

use near_sdk::json_types::{U128, U64};
use near_sdk::{env, near, require, AccountId, NearToken};

use crate::errors;
use crate::events::{self, WardEvent};
use crate::rules::{validate_guardians, validate_shares};
use crate::token::STORAGE_DEPOSIT;
use crate::types::{
    Child, ChildInput, Circle, Guardian, Payee, Rules, Trust, TrustId, TrustStatus,
};
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    /// Validates guardians (≤2/circle, ≥2 circles), shares = 10000, caregiver ≠ guardian.
    /// Attached NEAR covers storage + ops_balance; calls storage_deposit for each payee.
    #[payable]
    #[allow(clippy::too_many_arguments)]
    pub fn create_trust(
        &mut self,
        label: String,
        caregiver: AccountId,
        caregiver_circle: Circle,
        guardians: Vec<Guardian>,
        children: Vec<ChildInput>,
        payees: Vec<Payee>,
        rules: Rules,
        token: AccountId,
    ) -> TrustId {
        validate_guardians(&guardians, &caregiver).unwrap_or_else(|error| env::panic_str(error));
        validate_shares(&children).unwrap_or_else(|error| env::panic_str(error));
        require!(rules.time_scale > 0, errors::E31_INVALID_RULES);
        require!(rules.death_quorum == 3, errors::E31_INVALID_RULES);
        require!(rules.allowance_period.0 > 0, errors::E31_INVALID_RULES);
        require!(rules.graduation_tranches > 0, errors::E31_INVALID_RULES);

        let settlor = env::predecessor_account_id();
        let now = env::block_timestamp();
        let storage_before = env::storage_usage();

        let trust_id = self.next_trust_id;
        let trust = Trust {
            id: trust_id,
            label,
            settlor: settlor.clone(),
            dao: None,
            caregiver,
            caregiver_circle,
            guardians,
            children: children
                .into_iter()
                .map(|input| Child {
                    label: input.label,
                    account: None,
                    birth_ts: input.birth_ts,
                    share_bps: input.share_bps,
                    paid_out: U128(0),
                    tranches_paid: 0,
                    alive: true,
                })
                .collect(),
            payees,
            rules,
            token: token.clone(),
            balance: U128(0),
            ops_balance: NearToken::from_yoctonear(0),
            status: TrustStatus::Funding,
            paused: false,
            death_attestations: Vec::new(),
            cancel_window: None,
            pending_withdrawal: None,
            free_withdrawn: U128(0),
            free_period_start: U64(now),
            allowance_claimed_until: U64(0),
            activated_at: None,
            activation_balance: None,
            created_at: U64(now),
        };

        self.save_trust(trust.clone());
        self.next_trust_id = trust_id.checked_add(1).expect("trust id overflow");

        self.index_account(&trust.settlor, trust_id);
        self.index_account(&trust.caregiver, trust_id);
        for guardian in &trust.guardians {
            self.index_account(&guardian.account, trust_id);
        }

        let storage_used = env::storage_usage()
            .checked_sub(storage_before)
            .expect("storage usage decreased");
        let storage_cost = env::storage_byte_cost().saturating_mul(u128::from(storage_used));
        let payee_cost =
            STORAGE_DEPOSIT.saturating_mul(u128::try_from(trust.payees.len()).unwrap_or(u128::MAX));
        let required = storage_cost.saturating_add(payee_cost);
        let attached = env::attached_deposit();
        require!(attached >= required, errors::E29_INSUFFICIENT_DEPOSIT);

        let mut stored = self.trust_or_panic(trust_id);
        stored.ops_balance = attached.saturating_sub(required);
        self.save_trust(stored);

        for payee in &trust.payees {
            let _ = self.storage_deposit(token.clone(), payee.account.clone());
        }

        events::emit(WardEvent::TrustCreated { trust_id, settlor });
        trust_id
    }

    /// Settlor, while Funding. New shares for all children must still sum to 10000.
    pub fn add_child(&mut self, trust_id: TrustId, child: ChildInput, new_shares_bps: Vec<u16>) {
        let _ = (trust_id, child, new_shares_bps);
        todo!("W-2.7")
    }

    /// Settlor, once, while Funding.
    pub fn set_dao(&mut self, trust_id: TrustId, dao: AccountId) {
        let _ = (trust_id, dao);
        todo!("W-2.7")
    }

    /// Anyone, after `ends_at` → Active; snapshots activation_balance.
    pub fn finalize_activation(&mut self, trust_id: TrustId) {
        let _ = trust_id;
        todo!("W-3.3")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{
        account, child_input, demo_payees, guardian, guardians, rules, set_creator, trust,
    };
    use near_sdk::test_utils::get_created_receipts;

    fn create_args() -> (Vec<Guardian>, Vec<ChildInput>, Vec<Payee>, Rules) {
        (
            guardians(),
            vec![child_input("Ada", 5_000), child_input("Tobi", 5_000)],
            demo_payees(),
            rules(),
        )
    }

    #[test]
    fn create_trust_stores_and_indexes() {
        set_creator(account("settlor.near"), NearToken::from_near(10));
        let mut contract = Contract::new(None);
        let (guardian_set, children, payees, rules) = create_args();

        let id = contract.create_trust(
            "Ada & Tobi".to_string(),
            account("caregiver.near"),
            Circle::Paternal,
            guardian_set,
            children,
            payees,
            rules,
            account("tusdc.near"),
        );

        assert_eq!(id, 0);
        let stored = contract.get_trust(0).expect("trust stored");
        assert_eq!(stored.settlor, account("settlor.near"));
        assert_eq!(stored.status, TrustStatus::Funding);
        assert_eq!(stored.children.len(), 2);
        assert!(stored.ops_balance.as_yoctonear() > 0);
        assert!(stored.ops_balance < NearToken::from_near(10));
        assert_eq!(
            contract.get_trusts_for(account("settlor.near")),
            vec![stored.clone()]
        );
        assert_eq!(
            contract.get_trusts_for(account("caregiver.near")),
            vec![stored.clone()]
        );
        assert_eq!(
            contract.get_trusts_for(account("pastor.near")),
            vec![stored]
        );

        // One storage_deposit receipt per payee.
        assert_eq!(get_created_receipts().len(), 2);
    }

    #[test]
    fn create_trust_rejects_three_guardians_in_one_circle() {
        set_creator(account("settlor.near"), NearToken::from_near(10));
        let mut contract = Contract::new(None);
        let bad = vec![
            guardian("g1.near", Circle::Maternal),
            guardian("g2.near", Circle::Maternal),
            guardian("g3.near", Circle::Maternal),
        ];
        let (_, children, payees, rules) = create_args();

        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.create_trust(
                "x".to_string(),
                account("caregiver.near"),
                Circle::Paternal,
                bad,
                children,
                payees,
                rules,
                account("tusdc.near"),
            )
        }));
        let message = result.expect_err("must reject");
        assert!(panic_message(&message).contains("E08_CIRCLE_LIMIT"));
    }

    #[test]
    fn create_trust_rejects_shares_not_summing_to_100_percent() {
        set_creator(account("settlor.near"), NearToken::from_near(10));
        let mut contract = Contract::new(None);
        let (guardian_set, _, payees, rules) = create_args();

        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.create_trust(
                "x".to_string(),
                account("caregiver.near"),
                Circle::Paternal,
                guardian_set,
                vec![child_input("Ada", 4_000)],
                payees,
                rules,
                account("tusdc.near"),
            )
        }));
        let message = result.expect_err("must reject");
        assert!(panic_message(&message).contains("E10_SHARES_SUM"));
    }

    #[test]
    fn create_trust_requires_deposit() {
        set_creator(account("settlor.near"), NearToken::from_yoctonear(0));
        let mut contract = Contract::new(None);
        let (guardian_set, children, payees, rules) = create_args();

        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.create_trust(
                "x".to_string(),
                account("caregiver.near"),
                Circle::Paternal,
                guardian_set,
                children,
                payees,
                rules,
                account("tusdc.near"),
            )
        }));
        let message = result.expect_err("must reject");
        assert!(panic_message(&message).contains("E29_INSUFFICIENT_DEPOSIT"));
    }

    #[test]
    fn create_trust_rejects_caregiver_as_guardian() {
        set_creator(account("aunt.near"), NearToken::from_near(10));
        let mut contract = Contract::new(None);
        let (guardian_set, children, payees, rules) = create_args();

        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.create_trust(
                "x".to_string(),
                account("aunt.near"),
                Circle::Maternal,
                guardian_set,
                children,
                payees,
                rules,
                account("tusdc.near"),
            )
        }));
        let message = result.expect_err("must reject");
        assert!(panic_message(&message).contains("E11_CAREGIVER_IS_GUARDIAN"));
    }

    fn panic_message(payload: &Box<dyn std::any::Any + Send>) -> String {
        if let Some(message) = payload.downcast_ref::<String>() {
            message.clone()
        } else if let Some(message) = payload.downcast_ref::<&str>() {
            (*message).to_string()
        } else {
            String::new()
        }
    }

    #[test]
    fn test_helpers_still_build_a_trust() {
        assert_eq!(trust(7).id, 7);
    }
}
