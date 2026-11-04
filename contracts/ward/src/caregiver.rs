//! Caregiver: allowance and requests. (W-3.4, W-3.5)

use near_sdk::json_types::{U128, U64};
use near_sdk::{env, near, require};

use crate::access;
use crate::errors;
use crate::events::{self, WardEvent};
use crate::rules;
use crate::types::{
    CryptoHash, Request, RequestId, RequestKind, RequestStatus, Trust, TrustId, TrustStatus,
};
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    /// Max 1 period of arrears; works while paused.
    pub fn claim_allowance(&mut self, trust_id: TrustId) {
        let mut trust = self.trust_or_panic(trust_id);
        access::assert_caregiver(&trust);

        let now = env::block_timestamp();
        let amount = rules::allowance_due(&trust, now);
        require!(amount > 0, errors::E30_NOTHING_DUE);

        let previous_claim = trust.allowance_claimed_until;
        trust.balance = U128(trust.balance.0 - amount);
        trust.allowance_claimed_until = U64(now);
        let caregiver = trust.caregiver.clone();
        let token = trust.token.clone();
        self.save_trust(trust);

        events::emit(WardEvent::AllowanceClaimed {
            trust_id,
            amount: U128(amount),
        });
        let _ = self.payout_allowance(token, caregiver, U128(amount), trust_id, previous_claim);
    }

    /// Caregiver or guardian. Bounded by max_open_requests (E19).
    pub fn create_request(
        &mut self,
        trust_id: TrustId,
        kind: RequestKind,
        reason: String,
        receipt_hash: Option<CryptoHash>,
    ) -> RequestId {
        let trust = self.trust_or_panic(trust_id);
        let caller = env::predecessor_account_id();
        let is_guardian = trust
            .guardians
            .iter()
            .any(|guardian| guardian.account == caller);
        require!(
            caller == trust.caregiver || is_guardian,
            errors::E37_NOT_REQUESTER
        );
        require!(
            matches!(trust.status, TrustStatus::Active | TrustStatus::Graduating),
            errors::E12_INVALID_STATUS
        );

        validate_kind(&trust, &kind);
        let open = self
            .requests
            .iter()
            .filter(|(_, stored)| {
                stored.trust_id == trust_id
                    && matches!(
                        stored.status,
                        RequestStatus::Pending | RequestStatus::Approved
                    )
            })
            .count();
        require!(
            open < usize::from(trust.rules.max_open_requests),
            errors::E19_TOO_MANY_REQUESTS
        );

        let request_id = self.next_request_id;
        self.next_request_id = request_id.checked_add(1).expect("request id overflow");
        self.requests.insert(
            request_id,
            Request {
                id: request_id,
                trust_id,
                kind,
                created_by: caller,
                reason,
                receipt_hash,
                ai_review: None,
                approvals: Vec::new(),
                rejections: Vec::new(),
                child_flagged: false,
                status: RequestStatus::Pending,
                created_at: U64(env::block_timestamp()),
            },
        );

        events::emit(WardEvent::RequestCreated {
            trust_id,
            request_id,
        });
        request_id
    }
}

fn validate_kind(trust: &Trust, kind: &RequestKind) {
    match kind {
        RequestKind::PayeePayment { payee, amount } => {
            require!(amount.0 > 0, errors::E32_INVALID_AMOUNT);
            require!(
                trust
                    .payees
                    .iter()
                    .any(|registered| registered.account == *payee),
                errors::E20_NOT_A_PAYEE
            );
            require!(
                amount.0 <= trust.rules.large_threshold.0,
                errors::E40_REQUIRES_LARGE_SPEND
            );
        }
        RequestKind::LargeSpend { amount, .. } => {
            require!(amount.0 > 0, errors::E32_INVALID_AMOUNT);
        }
        RequestKind::SetChildAccount { child, .. } => {
            require!(
                trust.children.get(usize::from(*child)).is_some(),
                errors::E36_CHILD_NOT_FOUND
            );
        }
        RequestKind::ChildDeceased { child } => {
            let Some(stored) = trust.children.get(usize::from(*child)) else {
                env::panic_str(errors::E36_CHILD_NOT_FOUND);
            };
            require!(stored.alive, errors::E12_INVALID_STATUS);
        }
        RequestKind::Unpause => {
            require!(trust.paused, errors::E12_INVALID_STATUS);
        }
        RequestKind::VouchCancel => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::access::assert_guardian;
    use crate::test_utils::{account, insert_trust, set_caller, trust};
    use crate::time::NS_PER_MONTH;
    use crate::types::TrustStatus;
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

    fn active_trust() -> Trust {
        let mut trust = trust(0);
        trust.status = TrustStatus::Active;
        trust.activated_at = Some(U64(0));
        trust
    }

    #[test]
    fn claim_allowance_pays_and_advances_the_clock() {
        env_for("caregiver.near", NS_PER_MONTH);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());

        contract.claim_allowance(0);

        let stored = contract.get_trust(0).unwrap();
        assert_eq!(stored.balance, U128(2_000_000_000 - 150_000_000));
        assert_eq!(stored.allowance_claimed_until, U64(NS_PER_MONTH));
        assert_eq!(get_created_receipts()[0].receiver_id, account("tusdc.near"));
        assert!(get_logs()
            .iter()
            .any(|log| log.contains("allowance_claimed")));
    }

    #[test]
    fn claim_allowance_works_while_paused() {
        env_for("caregiver.near", NS_PER_MONTH);
        let mut contract = Contract::new(None);
        let mut stored = active_trust();
        stored.paused = true;
        insert_trust(&mut contract, stored);

        contract.claim_allowance(0);

        assert_eq!(
            contract.get_trust(0).unwrap().balance,
            U128(2_000_000_000 - 150_000_000)
        );
    }

    #[test]
    #[should_panic(expected = "E30_NOTHING_DUE")]
    fn claim_allowance_rejects_a_second_claim_in_the_same_period() {
        env_for("caregiver.near", NS_PER_MONTH);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());
        contract.claim_allowance(0);
        contract.claim_allowance(0);
    }

    #[test]
    #[should_panic(expected = "E04_NOT_CAREGIVER")]
    fn claim_allowance_rejects_non_caregivers() {
        env_for("stranger.near", NS_PER_MONTH);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());
        contract.claim_allowance(0);
    }

    #[test]
    fn caregiver_creates_a_request() {
        env_for("caregiver.near", 0);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());

        let id = contract.create_request(
            0,
            RequestKind::PayeePayment {
                payee: account("school.near"),
                amount: U128(10_000),
            },
            "term fees".to_string(),
            None,
        );

        assert_eq!(id, 0);
        let stored = &contract.get_requests(0, None, None)[0];
        assert_eq!(stored.created_by, account("caregiver.near"));
        assert_eq!(stored.reason, "term fees");
        assert_eq!(stored.status, RequestStatus::Pending);
        assert!(get_logs().iter().any(|log| log.contains("request_created")));
    }

    #[test]
    fn guardians_can_create_requests_too() {
        env_for("aunt.near", 0);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());

        let id = contract.create_request(0, RequestKind::VouchCancel, String::new(), None);
        assert_eq!(id, 0);
    }

    #[test]
    #[should_panic(expected = "E37_NOT_REQUESTER")]
    fn strangers_cannot_create_requests() {
        env_for("stranger.near", 0);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());
        contract.create_request(0, RequestKind::VouchCancel, String::new(), None);
    }

    #[test]
    #[should_panic(expected = "E12_INVALID_STATUS")]
    fn requests_need_an_active_trust() {
        env_for("caregiver.near", 0);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust(0));
        contract.create_request(0, RequestKind::VouchCancel, String::new(), None);
    }

    #[test]
    #[should_panic(expected = "E20_NOT_A_PAYEE")]
    fn payee_payments_need_a_registered_payee() {
        env_for("caregiver.near", 0);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());
        contract.create_request(
            0,
            RequestKind::PayeePayment {
                payee: account("stranger.near"),
                amount: U128(10_000),
            },
            String::new(),
            None,
        );
    }

    #[test]
    #[should_panic(expected = "E40_REQUIRES_LARGE_SPEND")]
    fn payee_payments_above_the_threshold_need_a_large_spend() {
        env_for("caregiver.near", 0);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());
        contract.create_request(
            0,
            RequestKind::PayeePayment {
                payee: account("school.near"),
                amount: U128(100_000_001),
            },
            String::new(),
            None,
        );
    }

    #[test]
    #[should_panic(expected = "E36_CHILD_NOT_FOUND")]
    fn set_child_account_needs_a_valid_child() {
        env_for("caregiver.near", 0);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());
        contract.create_request(
            0,
            RequestKind::SetChildAccount {
                child: 9,
                account: account("ada.near"),
            },
            String::new(),
            None,
        );
    }

    #[test]
    #[should_panic(expected = "E12_INVALID_STATUS")]
    fn cannot_report_a_dead_child_twice() {
        env_for("caregiver.near", 0);
        let mut contract = Contract::new(None);
        let mut stored = active_trust();
        stored.children[0].alive = false;
        insert_trust(&mut contract, stored);
        contract.create_request(
            0,
            RequestKind::ChildDeceased { child: 0 },
            String::new(),
            None,
        );
    }

    #[test]
    #[should_panic(expected = "E12_INVALID_STATUS")]
    fn unpause_requires_a_paused_trust() {
        env_for("caregiver.near", 0);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());
        contract.create_request(0, RequestKind::Unpause, String::new(), None);
    }

    #[test]
    #[should_panic(expected = "E19_TOO_MANY_REQUESTS")]
    fn open_requests_are_capped() {
        env_for("caregiver.near", 0);
        let mut contract = Contract::new(None);
        let mut stored = active_trust();
        stored.rules.max_open_requests = 1;
        insert_trust(&mut contract, stored);
        contract.create_request(0, RequestKind::VouchCancel, String::new(), None);
        contract.create_request(0, RequestKind::VouchCancel, String::new(), None);
    }

    #[test]
    fn assert_guardian_helper_still_works_for_the_new_flow() {
        set_caller(account("pastor.near"));
        let trust = active_trust();
        assert_eq!(assert_guardian(&trust).0, account("pastor.near"));
    }
}
