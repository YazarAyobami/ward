//! Settlor: deposits, withdrawals (free cap / delay / veto), death-claim cancel. (W-2.8, W-2.9, W-3.2)

use near_sdk::json_types::{U128, U64};
use near_sdk::{env, near, require, AccountId};

use crate::access;
use crate::errors;
use crate::events::{self, WardEvent};
use crate::rules;
use crate::time;
use crate::types::{PendingWithdrawal, Trust, TrustId, TrustStatus};
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    /// ≤ free cap per period: paid now. Above: PendingWithdrawal (veto window). Blocked during DeathClaimed (E13).
    pub fn withdraw(&mut self, trust_id: TrustId, amount: U128) {
        let mut trust = self.trust_or_panic(trust_id);
        access::assert_settlor(&trust);
        require!(amount.0 > 0, errors::E32_INVALID_AMOUNT);
        match trust.status {
            TrustStatus::DeathClaimed { .. } => env::panic_str(errors::E13_CLAIM_PENDING),
            TrustStatus::Funding | TrustStatus::Active | TrustStatus::Graduating => {}
            TrustStatus::Closed => env::panic_str(errors::E12_INVALID_STATUS),
        }
        require!(!trust.paused, errors::E18_PAUSED);
        // One withdrawal in flight at a time: the veto window cannot be bypassed by stacking.
        require!(
            trust.pending_withdrawal.is_none(),
            errors::E33_WITHDRAWAL_PENDING
        );
        require!(
            amount.0 <= trust.balance.0,
            errors::E23_INSUFFICIENT_BALANCE
        );

        let now = env::block_timestamp();
        roll_free_period(&mut trust, now);

        let within_free_cap =
            trust.free_withdrawn.0.saturating_add(amount.0) <= trust.rules.withdraw_free_cap.0;

        if within_free_cap {
            trust.free_withdrawn = U128(trust.free_withdrawn.0 + amount.0);
            trust.balance = U128(trust.balance.0 - amount.0);
            let receiver = trust.settlor.clone();
            let token = trust.token.clone();
            self.save_trust(trust);

            events::emit(WardEvent::WithdrawalExecuted { trust_id, amount });
            let _ = self.payout(token, receiver, amount, trust_id, None);
        } else {
            let execute_after = now.saturating_add(time::scaled(
                trust.rules.withdraw_delay.0,
                trust.rules.time_scale,
            ));
            trust.pending_withdrawal = Some(PendingWithdrawal {
                amount,
                requested_at: U64(now),
                execute_after: U64(execute_after),
                vetoes: Vec::new(),
            });
            self.save_trust(trust);

            events::emit(WardEvent::WithdrawalRequested { trust_id, amount });
        }
    }

    /// Anyone, after the delay, if not vetoed by 2 circles.
    pub fn execute_withdrawal(&mut self, trust_id: TrustId) {
        let mut trust = self.trust_or_panic(trust_id);
        let Some(pending) = trust.pending_withdrawal.clone() else {
            env::panic_str(errors::E34_NO_PENDING_WITHDRAWAL);
        };

        require!(
            rules::distinct_circles(&pending.vetoes) < 2,
            errors::E16_WITHDRAW_VETOED
        );
        require!(
            env::block_timestamp() >= pending.execute_after.0,
            errors::E15_WITHDRAW_DELAY
        );
        require!(!trust.paused, errors::E18_PAUSED);
        require!(
            pending.amount.0 <= trust.balance.0,
            errors::E23_INSUFFICIENT_BALANCE
        );

        trust.pending_withdrawal = None;
        trust.balance = U128(trust.balance.0 - pending.amount.0);
        let receiver = trust.settlor.clone();
        let token = trust.token.clone();
        self.save_trust(trust);

        events::emit(WardEvent::WithdrawalExecuted {
            trust_id,
            amount: pending.amount,
        });
        let _ = self.payout(token, receiver, pending.amount, trust_id, None);
    }

    /// 1st cancel in window: immediate. 2nd: needs an approved VouchCancel (E14).
    pub fn cancel_death_claim(&mut self, trust_id: TrustId) {
        let _ = trust_id;
        todo!("W-3.2")
    }
}

impl Contract {
    pub(crate) fn internal_deposit(
        &mut self,
        trust_id: TrustId,
        _sender: AccountId,
        amount: U128,
    ) -> U128 {
        let mut trust = self.trust_or_panic(trust_id);
        require!(amount.0 > 0, errors::E32_INVALID_AMOUNT);
        match trust.status {
            TrustStatus::DeathClaimed { .. } => env::panic_str(errors::E13_CLAIM_PENDING),
            TrustStatus::Funding => {}
            _ => env::panic_str(errors::E12_INVALID_STATUS),
        }

        trust.balance = U128(
            trust
                .balance
                .0
                .checked_add(amount.0)
                .expect("balance overflow"),
        );
        self.save_trust(trust);

        events::emit(WardEvent::Deposit { trust_id, amount });
        amount
    }
}

/// The free cap resets with the allowance period (ARCHITECTURE §4).
fn roll_free_period(trust: &mut Trust, now: u64) {
    let period_ns = time::scaled(trust.rules.allowance_period.0, trust.rules.time_scale).max(1);
    if now.saturating_sub(trust.free_period_start.0) >= period_ns {
        trust.free_withdrawn = U128(0);
        trust.free_period_start = U64(now);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{account, insert_trust, set_caller, trust};
    use near_sdk::test_utils::{get_created_receipts, get_logs, VMContextBuilder};
    use near_sdk::{testing_env, NearToken};

    fn env_for(caller: &str, now: u64) {
        let context = VMContextBuilder::new()
            .predecessor_account_id(account(caller))
            .block_timestamp(now)
            .build();
        testing_env!(context);
    }

    fn funded_trust(contract: &mut Contract, status: TrustStatus) -> Trust {
        let mut trust = trust(0);
        trust.status = status;
        insert_trust(contract, trust.clone());
        trust
    }

    #[test]
    fn deposit_adds_to_balance_and_emits() {
        env_for("settlor.near", 0);
        let mut contract = Contract::new(None);
        funded_trust(&mut contract, TrustStatus::Funding);

        let accepted = contract.internal_deposit(0, account("settlor.near"), U128(1_000));

        assert_eq!(accepted, U128(1_000));
        assert_eq!(contract.get_trust(0).unwrap().balance, U128(2_000_001_000));
        assert!(get_logs().iter().any(|log| log.contains("\"deposit\"")));
    }

    #[test]
    #[should_panic(expected = "E32_INVALID_AMOUNT")]
    fn deposit_rejects_zero() {
        env_for("settlor.near", 0);
        let mut contract = Contract::new(None);
        funded_trust(&mut contract, TrustStatus::Funding);
        contract.internal_deposit(0, account("settlor.near"), U128(0));
    }

    #[test]
    #[should_panic(expected = "E12_INVALID_STATUS")]
    fn deposit_rejected_after_activation() {
        env_for("settlor.near", 0);
        let mut contract = Contract::new(None);
        funded_trust(&mut contract, TrustStatus::Active);
        contract.internal_deposit(0, account("settlor.near"), U128(1));
    }

    #[test]
    #[should_panic(expected = "E13_CLAIM_PENDING")]
    fn deposit_rejected_while_death_claimed() {
        env_for("settlor.near", 0);
        let mut contract = Contract::new(None);
        funded_trust(
            &mut contract,
            TrustStatus::DeathClaimed {
                claimed_at: U64(0),
                ends_at: U64(1),
            },
        );
        contract.internal_deposit(0, account("settlor.near"), U128(1));
    }

    #[test]
    fn withdraw_under_free_cap_is_instant() {
        env_for("settlor.near", 0);
        let mut contract = Contract::new(None);
        funded_trust(&mut contract, TrustStatus::Active);

        contract.withdraw(0, U128(50_000_000));

        let trust = contract.get_trust(0).unwrap();
        assert_eq!(trust.balance, U128(2_000_000_000 - 50_000_000));
        assert_eq!(trust.free_withdrawn, U128(50_000_000));
        assert!(trust.pending_withdrawal.is_none());

        let receipts = get_created_receipts();
        assert_eq!(receipts[0].receiver_id, account("tusdc.near"));
        assert!(get_logs()
            .iter()
            .any(|log| log.contains("\"withdrawal_executed\"")));
    }

    #[test]
    fn withdraw_above_free_cap_is_pending() {
        env_for("settlor.near", 0);
        let mut contract = Contract::new(None);
        funded_trust(&mut contract, TrustStatus::Active);

        contract.withdraw(0, U128(50_000_001));

        let trust = contract.get_trust(0).unwrap();
        assert_eq!(trust.balance, U128(2_000_000_000));
        assert_eq!(trust.free_withdrawn, U128(0));
        let pending = trust.pending_withdrawal.expect("pending withdrawal");
        assert_eq!(pending.amount, U128(50_000_001));
        assert_eq!(pending.execute_after.0, crate::time::NS_PER_DAY);
        assert!(pending.vetoes.is_empty());
        assert!(get_logs()
            .iter()
            .any(|log| log.contains("\"withdrawal_requested\"")));
    }

    #[test]
    fn free_cap_resets_after_one_period() {
        env_for("settlor.near", crate::time::NS_PER_MONTH);
        let mut contract = Contract::new(None);
        let mut trust = funded_trust(&mut contract, TrustStatus::Active);
        trust.free_withdrawn = U128(50_000_000);
        trust.free_period_start = U64(0);
        insert_trust(&mut contract, trust);

        contract.withdraw(0, U128(50_000_000));

        let trust = contract.get_trust(0).unwrap();
        assert_eq!(trust.free_withdrawn, U128(50_000_000));
        assert_eq!(trust.free_period_start.0, crate::time::NS_PER_MONTH);
        assert!(trust.pending_withdrawal.is_none());
    }

    #[test]
    #[should_panic(expected = "E02_NOT_SETTLOR")]
    fn withdraw_rejects_non_settlor() {
        env_for("stranger.near", 0);
        let mut contract = Contract::new(None);
        funded_trust(&mut contract, TrustStatus::Active);
        contract.withdraw(0, U128(1));
    }

    #[test]
    #[should_panic(expected = "E32_INVALID_AMOUNT")]
    fn withdraw_rejects_zero() {
        env_for("settlor.near", 0);
        let mut contract = Contract::new(None);
        funded_trust(&mut contract, TrustStatus::Active);
        contract.withdraw(0, U128(0));
    }

    #[test]
    #[should_panic(expected = "E23_INSUFFICIENT_BALANCE")]
    fn withdraw_rejects_more_than_balance() {
        env_for("settlor.near", 0);
        let mut contract = Contract::new(None);
        funded_trust(&mut contract, TrustStatus::Active);
        contract.withdraw(0, U128(2_000_000_001));
    }

    #[test]
    #[should_panic(expected = "E13_CLAIM_PENDING")]
    fn no_withdrawal_while_death_claim_pending() {
        env_for("settlor.near", 0);
        let mut contract = Contract::new(None);
        funded_trust(
            &mut contract,
            TrustStatus::DeathClaimed {
                claimed_at: U64(0),
                ends_at: U64(1),
            },
        );
        contract.withdraw(0, U128(1));
    }

    #[test]
    #[should_panic(expected = "E18_PAUSED")]
    fn withdraw_rejected_while_paused() {
        env_for("settlor.near", 0);
        let mut contract = Contract::new(None);
        let mut trust = funded_trust(&mut contract, TrustStatus::Active);
        trust.paused = true;
        insert_trust(&mut contract, trust);
        contract.withdraw(0, U128(1));
    }

    #[test]
    #[should_panic(expected = "E33_WITHDRAWAL_PENDING")]
    fn withdraw_rejected_while_another_is_pending() {
        env_for("settlor.near", 0);
        let mut contract = Contract::new(None);
        let mut trust = funded_trust(&mut contract, TrustStatus::Active);
        trust.pending_withdrawal = Some(PendingWithdrawal {
            amount: U128(1),
            requested_at: U64(0),
            execute_after: U64(1),
            vetoes: Vec::new(),
        });
        insert_trust(&mut contract, trust);
        contract.withdraw(0, U128(1));
    }

    #[test]
    fn zero_free_cap_makes_every_withdrawal_pending() {
        env_for("settlor.near", 0);
        let mut contract = Contract::new(None);
        let mut trust = funded_trust(&mut contract, TrustStatus::Active);
        trust.rules.withdraw_free_cap = U128(0);
        insert_trust(&mut contract, trust);

        contract.withdraw(0, U128(1));

        assert!(contract.get_trust(0).unwrap().pending_withdrawal.is_some());
        assert!(get_created_receipts().is_empty());
    }

    #[test]
    fn set_caller_helper_still_defaults_to_no_deposit() {
        set_caller(account("settlor.near"));
        assert_eq!(
            near_sdk::env::attached_deposit(),
            NearToken::from_yoctonear(0)
        );
    }

    fn pending_withdrawal(amount: u128, execute_after: u64) -> PendingWithdrawal {
        PendingWithdrawal {
            amount: U128(amount),
            requested_at: U64(0),
            execute_after: U64(execute_after),
            vetoes: Vec::new(),
        }
    }

    #[test]
    fn execute_after_delay() {
        env_for("stranger.near", crate::time::NS_PER_DAY);
        let mut contract = Contract::new(None);
        let mut trust = funded_trust(&mut contract, TrustStatus::Active);
        trust.pending_withdrawal = Some(pending_withdrawal(100_000_000, crate::time::NS_PER_DAY));
        insert_trust(&mut contract, trust);

        contract.execute_withdrawal(0);

        let stored = contract.get_trust(0).unwrap();
        assert!(stored.pending_withdrawal.is_none());
        assert_eq!(stored.balance, U128(1_900_000_000));
        assert_eq!(get_created_receipts()[0].receiver_id, account("tusdc.near"));
        assert!(get_logs()
            .iter()
            .any(|log| log.contains("withdrawal_executed")));
    }

    #[test]
    #[should_panic(expected = "E15_WITHDRAW_DELAY")]
    fn execute_before_delay_fails() {
        env_for("stranger.near", crate::time::NS_PER_DAY - 1);
        let mut contract = Contract::new(None);
        let mut trust = funded_trust(&mut contract, TrustStatus::Active);
        trust.pending_withdrawal = Some(pending_withdrawal(100_000_000, crate::time::NS_PER_DAY));
        insert_trust(&mut contract, trust);
        contract.execute_withdrawal(0);
    }

    #[test]
    #[should_panic(expected = "E34_NO_PENDING_WITHDRAWAL")]
    fn execute_without_pending_fails() {
        env_for("stranger.near", crate::time::NS_PER_DAY);
        let mut contract = Contract::new(None);
        funded_trust(&mut contract, TrustStatus::Active);
        contract.execute_withdrawal(0);
    }

    #[test]
    #[should_panic(expected = "E16_WITHDRAW_VETOED")]
    fn execute_with_two_circle_vetoes_fails() {
        env_for("stranger.near", crate::time::NS_PER_DAY);
        let mut contract = Contract::new(None);
        let mut trust = funded_trust(&mut contract, TrustStatus::Active);
        let mut pending = pending_withdrawal(100_000_000, 0);
        pending.vetoes = vec![
            crate::types::Approval {
                account: account("aunt.near"),
                circle: crate::types::Circle::Maternal,
            },
            crate::types::Approval {
                account: account("teacher.near"),
                circle: crate::types::Circle::Institution,
            },
        ];
        trust.pending_withdrawal = Some(pending);
        insert_trust(&mut contract, trust);
        contract.execute_withdrawal(0);
    }

    #[test]
    #[should_panic(expected = "E18_PAUSED")]
    fn execute_while_paused_fails() {
        env_for("stranger.near", crate::time::NS_PER_DAY);
        let mut contract = Contract::new(None);
        let mut trust = funded_trust(&mut contract, TrustStatus::Active);
        trust.paused = true;
        trust.pending_withdrawal = Some(pending_withdrawal(100_000_000, 0));
        insert_trust(&mut contract, trust);
        contract.execute_withdrawal(0);
    }

    #[test]
    #[should_panic(expected = "E23_INSUFFICIENT_BALANCE")]
    fn execute_with_insufficient_balance_fails() {
        env_for("stranger.near", crate::time::NS_PER_DAY);
        let mut contract = Contract::new(None);
        let mut trust = funded_trust(&mut contract, TrustStatus::Active);
        trust.balance = U128(50_000_000);
        trust.pending_withdrawal = Some(pending_withdrawal(100_000_000, 0));
        insert_trust(&mut contract, trust);
        contract.execute_withdrawal(0);
    }
}
