//! Child: flag (≥14) and graduation tranches (≥18). (W-3.8, W-3.9)

use near_sdk::json_types::U128;
use near_sdk::{env, near, require};

use crate::access;
use crate::errors;
use crate::events::{self, WardEvent};
use crate::rules;
use crate::time;
use crate::types::{RequestId, RequestStatus, Trust, TrustId, TrustStatus};
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    pub fn flag(&mut self, request_id: RequestId, child_idx: u8) {
        let mut request = self.request_or_panic(request_id);
        let trust = self.trust_or_panic(request.trust_id);
        access::assert_child(&trust, child_idx);

        let child = &trust.children[usize::from(child_idx)];
        require!(child.alive, errors::E12_INVALID_STATUS);
        let age = time::age_years(
            child.birth_ts.0,
            env::block_timestamp(),
            trust.rules.time_scale,
        );
        require!(age >= trust.rules.flag_age_years, errors::E22_TOO_YOUNG);
        require!(
            matches!(
                request.status,
                RequestStatus::Pending | RequestStatus::Approved
            ),
            errors::E38_REQUEST_NOT_PENDING
        );

        request.child_flagged = true;
        if request.status == RequestStatus::Approved && !rules::is_satisfied(&trust, &request) {
            request.status = RequestStatus::Pending;
        }
        self.requests.insert(request_id, request);

        events::emit(WardEvent::RequestFlagged { request_id });
    }

    /// One tranche per period, up to graduation_tranches; pausable between tranches.
    pub fn claim_graduation(&mut self, trust_id: TrustId, child_idx: u8) {
        let mut trust = self.trust_or_panic(trust_id);
        let index = usize::from(child_idx);
        if trust.children.get(index).is_none() {
            env::panic_str(errors::E36_CHILD_NOT_FOUND);
        }
        access::assert_child(&trust, child_idx);
        require!(
            matches!(trust.status, TrustStatus::Active | TrustStatus::Graduating),
            errors::E12_INVALID_STATUS
        );
        require!(!trust.paused, errors::E18_PAUSED);

        let now = env::block_timestamp();
        let child = &trust.children[index];
        require!(child.alive, errors::E12_INVALID_STATUS);
        let age = time::age_years(child.birth_ts.0, now, trust.rules.time_scale);
        require!(age >= trust.rules.majority_age_years, errors::E22_TOO_YOUNG);
        require!(
            child.tranches_paid < trust.rules.graduation_tranches,
            errors::E12_INVALID_STATUS
        );
        let unlocked = trust.activated_at.map_or(0, |activated_at| {
            time::periods_elapsed(
                activated_at.0,
                now,
                trust.rules.allowance_period.0,
                trust.rules.time_scale,
            )
        });
        require!(
            unlocked > u64::from(child.tranches_paid),
            errors::E41_TRANCHE_NOT_DUE
        );

        let tranches_left = trust.rules.graduation_tranches - child.tranches_paid;
        let remaining = rules::remaining_share(&trust, index);
        let amount = remaining / u128::from(tranches_left);
        require!(amount > 0, errors::E30_NOTHING_DUE);
        require!(amount <= trust.balance.0, errors::E23_INSUFFICIENT_BALANCE);

        trust.balance = U128(trust.balance.0 - amount);
        let receiver = {
            let child = &mut trust.children[index];
            child.paid_out = U128(child.paid_out.0 + amount);
            child.tranches_paid += 1;
            child
                .account
                .clone()
                .expect("assert_child requires a registered account")
        };
        refresh_graduation_status(&mut trust);
        let token = trust.token.clone();
        self.save_trust(trust);

        events::emit(WardEvent::ChildGraduationTranche {
            trust_id,
            child: child_idx,
            amount: U128(amount),
        });
        let _ = self.payout_graduation(token, receiver, U128(amount), trust_id, child_idx);
    }
}

fn refresh_graduation_status(trust: &mut Trust) {
    let all_done = trust
        .children
        .iter()
        .all(|child| !child.alive || child.tranches_paid >= trust.rules.graduation_tranches);
    trust.status = if trust.balance.0 == 0 && all_done {
        TrustStatus::Closed
    } else {
        TrustStatus::Graduating
    };
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{account, insert_request, insert_trust, request, set_caller, trust};
    use crate::time::{NS_PER_MONTH, NS_PER_YEAR};
    use crate::types::{RequestKind, RequestStatus, TrustStatus};
    use near_sdk::json_types::U64;
    use near_sdk::test_utils::{get_created_receipts, get_logs, VMContextBuilder};
    use near_sdk::testing_env;

    fn env_for(caller: &str, now: u64) {
        testing_env!(VMContextBuilder::new()
            .predecessor_account_id(account(caller))
            .signer_account_id(account(caller))
            .block_timestamp(now)
            .build());
    }

    fn trust_with_child_account(now: u64) -> Trust {
        let mut trust = trust(0);
        trust.status = TrustStatus::Active;
        trust.activated_at = Some(U64(0));
        trust.children[0].account = Some(account("ada.near"));
        trust.children[0].birth_ts = U64(now.saturating_sub(20 * NS_PER_YEAR));
        trust
    }

    #[test]
    fn flag_marks_the_request_for_two_circles() {
        env_for("ada.near", 20 * NS_PER_YEAR);
        let mut contract = Contract::new(None);
        let mut trust = trust_with_child_account(20 * NS_PER_YEAR);
        trust.status = TrustStatus::Active;
        insert_trust(&mut contract, trust);
        insert_request(
            &mut contract,
            request(
                0,
                RequestKind::PayeePayment {
                    payee: account("school.near"),
                    amount: U128(10_000),
                },
            ),
        );

        contract.flag(0, 0);

        assert!(contract.get_requests(0, None, None)[0].child_flagged);
        assert!(get_logs().iter().any(|log| log.contains("request_flagged")));
    }

    #[test]
    fn flag_downgrades_an_approved_request_that_no_longer_satisfies() {
        env_for("ada.near", 20 * NS_PER_YEAR);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust_with_child_account(20 * NS_PER_YEAR));
        let mut stored = request(
            0,
            RequestKind::PayeePayment {
                payee: account("school.near"),
                amount: U128(10_000),
            },
        );
        stored.status = RequestStatus::Approved;
        stored.approvals = vec![crate::test_utils::approval(
            "aunt.near",
            crate::types::Circle::Maternal,
        )];
        insert_request(&mut contract, stored);

        contract.flag(0, 0);

        let stored = &contract.get_requests(0, None, None)[0];
        assert!(stored.child_flagged);
        assert_eq!(stored.status, RequestStatus::Pending);
    }

    #[test]
    #[should_panic(expected = "E22_TOO_YOUNG")]
    fn flag_requires_fourteen() {
        let now = 10 * NS_PER_YEAR;
        env_for("ada.near", now);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust_with_child_account(now));
        insert_request(&mut contract, request(0, RequestKind::Unpause));
        contract.flag(0, 0);
    }

    #[test]
    #[should_panic(expected = "E05_NOT_CHILD")]
    fn only_the_child_can_flag() {
        env_for("stranger.near", 20 * NS_PER_YEAR);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust_with_child_account(20 * NS_PER_YEAR));
        insert_request(&mut contract, request(0, RequestKind::Unpause));
        contract.flag(0, 0);
    }

    #[test]
    fn graduation_pays_one_tranche_per_period() {
        let now = 20 * NS_PER_YEAR;
        env_for("ada.near", now);
        let mut contract = Contract::new(None);
        let mut trust = trust_with_child_account(now);
        trust.activated_at = Some(U64(now.saturating_sub(NS_PER_MONTH)));
        insert_trust(&mut contract, trust);

        contract.claim_graduation(0, 0);

        let stored = contract.get_trust(0).unwrap();
        assert_eq!(stored.children[0].tranches_paid, 1);
        assert_eq!(stored.status, TrustStatus::Graduating);
        assert_eq!(stored.children[0].paid_out, U128(333_333_333));
        assert_eq!(get_created_receipts()[0].receiver_id, account("tusdc.near"));
        assert!(get_logs()
            .iter()
            .any(|log| log.contains("child_graduation_tranche")));
    }

    #[test]
    fn the_last_tranche_closes_the_trust() {
        let now = 20 * NS_PER_YEAR;
        env_for("ada.near", now);
        let mut contract = Contract::new(None);
        let mut trust = trust_with_child_account(now);
        trust.children[1].alive = false;
        trust.children[1].share_bps = 0;
        trust.children[0].share_bps = 10_000;
        trust.children[0].paid_out = U128(666_666_666);
        trust.children[0].tranches_paid = 2;
        trust.balance = U128(333_333_334);
        trust.activated_at = Some(U64(now.saturating_sub(3 * NS_PER_MONTH)));
        insert_trust(&mut contract, trust);

        contract.claim_graduation(0, 0);

        let stored = contract.get_trust(0).unwrap();
        assert_eq!(stored.balance, U128(0));
        assert_eq!(stored.children[0].tranches_paid, 3);
        assert_eq!(stored.status, TrustStatus::Closed);
    }

    #[test]
    #[should_panic(expected = "E41_TRANCHE_NOT_DUE")]
    fn a_second_tranche_waits_a_period() {
        let now = 20 * NS_PER_YEAR;
        env_for("ada.near", now);
        let mut contract = Contract::new(None);
        let mut trust = trust_with_child_account(now);
        trust.activated_at = Some(U64(now.saturating_sub(NS_PER_MONTH)));
        insert_trust(&mut contract, trust);

        contract.claim_graduation(0, 0);
        contract.claim_graduation(0, 0);
    }

    #[test]
    #[should_panic(expected = "E18_PAUSED")]
    fn graduation_is_pausable() {
        let now = 20 * NS_PER_YEAR;
        env_for("ada.near", now);
        let mut contract = Contract::new(None);
        let mut trust = trust_with_child_account(now);
        trust.activated_at = Some(U64(now.saturating_sub(NS_PER_MONTH)));
        trust.paused = true;
        insert_trust(&mut contract, trust);
        contract.claim_graduation(0, 0);
    }

    #[test]
    #[should_panic(expected = "E22_TOO_YOUNG")]
    fn graduation_requires_eighteen() {
        let now = 20 * NS_PER_YEAR;
        env_for("ada.near", now);
        let mut contract = Contract::new(None);
        let mut trust = trust_with_child_account(now);
        trust.children[0].birth_ts = U64(now.saturating_sub(17 * NS_PER_YEAR));
        trust.activated_at = Some(U64(now.saturating_sub(NS_PER_MONTH)));
        insert_trust(&mut contract, trust);
        contract.claim_graduation(0, 0);
    }

    #[test]
    #[should_panic(expected = "E05_NOT_CHILD")]
    fn only_the_child_can_claim_graduation() {
        let now = 20 * NS_PER_YEAR;
        env_for("stranger.near", now);
        let mut contract = Contract::new(None);
        let mut trust = trust_with_child_account(now);
        trust.activated_at = Some(U64(now.saturating_sub(NS_PER_MONTH)));
        insert_trust(&mut contract, trust);
        contract.claim_graduation(0, 0);
    }

    #[test]
    #[should_panic(expected = "E36_CHILD_NOT_FOUND")]
    fn graduation_rejects_an_unknown_child() {
        let now = 20 * NS_PER_YEAR;
        env_for("ada.near", now);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust_with_child_account(now));
        contract.claim_graduation(0, 9);
    }

    #[test]
    #[should_panic(expected = "E12_INVALID_STATUS")]
    fn a_dead_child_cannot_graduate() {
        let now = 20 * NS_PER_YEAR;
        env_for("ada.near", now);
        let mut contract = Contract::new(None);
        let mut trust = trust_with_child_account(now);
        trust.activated_at = Some(U64(now.saturating_sub(NS_PER_MONTH)));
        trust.children[0].alive = false;
        insert_trust(&mut contract, trust);
        contract.claim_graduation(0, 0);
    }

    #[test]
    fn set_caller_helper_still_defaults_the_caller() {
        set_caller(account("ada.near"));
        assert_eq!(env::predecessor_account_id(), account("ada.near"));
    }
}
