//! Guardian actions. (W-3.1, W-2.9, W-3.6, W-3.7)

use near_sdk::json_types::U64;
use near_sdk::{env, near, require};

use crate::access;
use crate::errors;
use crate::events::{self, WardEvent};
use crate::rules;
use crate::time;
use crate::types::{
    Approval, CryptoHash, DeathAttestation, RequestId, RequestStatus, TrustId, TrustStatus,
};
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    /// 3 attestations (cross-circle by construction) → DeathClaimed.
    pub fn attest_death(&mut self, trust_id: TrustId, evidence_hash: CryptoHash) {
        let mut trust = self.trust_or_panic(trust_id);
        let (guardian, _) = access::assert_guardian(&trust);

        match trust.status {
            TrustStatus::Funding | TrustStatus::Active | TrustStatus::Graduating => {}
            TrustStatus::DeathClaimed { .. } => env::panic_str(errors::E13_CLAIM_PENDING),
            TrustStatus::Closed => env::panic_str(errors::E12_INVALID_STATUS),
        }
        require!(
            !trust
                .death_attestations
                .iter()
                .any(|attestation| attestation.guardian == guardian),
            errors::E17_ALREADY_ATTESTED
        );

        let now = env::block_timestamp();
        trust.death_attestations.push(DeathAttestation {
            guardian: guardian.clone(),
            evidence_hash,
            at: U64(now),
        });

        if trust.death_attestations.len() >= usize::from(trust.rules.death_quorum) {
            let ends_at = now.saturating_add(time::scaled(
                trust.rules.waiting_period.0,
                trust.rules.time_scale,
            ));
            trust.status = TrustStatus::DeathClaimed {
                claimed_at: U64(now),
                ends_at: U64(ends_at),
            };
        }
        self.save_trust(trust);

        events::emit(WardEvent::DeathAttested { trust_id, guardian });
    }

    /// Executes the request when its rule is met.
    pub fn approve(&mut self, request_id: RequestId) {
        let mut request = self.request_or_panic(request_id);
        let trust = self.trust_or_panic(request.trust_id);
        let (account, circle) = access::assert_guardian(&trust);

        // A satisfied request can be poked again, e.g. after an unpause or a failed payout.
        if request.status == RequestStatus::Approved {
            if rules::is_satisfied(&trust, &request) {
                self.execute_request(request_id);
            } else {
                request.status = RequestStatus::Pending;
                self.requests.insert(request_id, request);
            }
            return;
        }
        require!(
            request.status == RequestStatus::Pending,
            errors::E38_REQUEST_NOT_PENDING
        );

        let voted = request
            .approvals
            .iter()
            .chain(request.rejections.iter())
            .any(|vote| vote.account == account);
        if voted {
            require!(
                rules::is_satisfied(&trust, &request),
                errors::E21_ALREADY_VOTED
            );
            request.status = RequestStatus::Approved;
            self.requests.insert(request_id, request);
            self.execute_request(request_id);
            return;
        }

        request.approvals.push(Approval {
            account: account.clone(),
            circle,
        });
        events::emit(WardEvent::RequestApproved {
            request_id,
            guardian: account,
        });

        if rules::is_satisfied(&trust, &request) {
            request.status = RequestStatus::Approved;
            self.requests.insert(request_id, request);
            self.execute_request(request_id);
        } else {
            self.requests.insert(request_id, request);
        }
    }

    pub fn reject(&mut self, request_id: RequestId) {
        let mut request = self.request_or_panic(request_id);
        let trust = self.trust_or_panic(request.trust_id);
        let (account, circle) = access::assert_guardian(&trust);

        require!(
            request.status == RequestStatus::Pending,
            errors::E38_REQUEST_NOT_PENDING
        );
        let voted = request
            .approvals
            .iter()
            .chain(request.rejections.iter())
            .any(|vote| vote.account == account);
        require!(!voted, errors::E21_ALREADY_VOTED);

        request.rejections.push(Approval { account, circle });
        if rules::is_rejected(&request) {
            request.status = RequestStatus::Rejected;
        }
        self.requests.insert(request_id, request);

        events::emit(WardEvent::RequestRejected { request_id });
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
        let mut trust = self.trust_or_panic(trust_id);
        let (by, _) = access::assert_guardian(&trust);
        require!(
            matches!(trust.status, TrustStatus::Active | TrustStatus::Graduating),
            errors::E12_INVALID_STATUS
        );

        trust.paused = true;
        self.save_trust(trust);

        events::emit(WardEvent::TrustPaused { trust_id, by });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{
        account, approval, guardian, insert_request, insert_trust, request, set_caller, trust,
    };
    use crate::time::NS_PER_MONTH;
    use crate::types::{Circle, PendingWithdrawal, RequestKind, RequestStatus, TrustStatus};
    use near_sdk::json_types::{U128, U64};
    use near_sdk::test_utils::{get_created_receipts, get_logs, VMContextBuilder};
    use near_sdk::testing_env;

    fn env_for(caller: &str, now: u64) {
        let context = VMContextBuilder::new()
            .predecessor_account_id(account(caller))
            .block_timestamp(now)
            .build();
        testing_env!(context);
    }

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

    fn active_trust() -> crate::types::Trust {
        let mut trust = trust(0);
        trust.status = TrustStatus::Active;
        trust.activated_at = Some(U64(0));
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

    #[test]
    fn three_attestations_claim_death() {
        env_for("aunt.near", 0);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());

        contract.attest_death(0, [1; 32]);
        set_caller(account("teacher.near"));
        contract.attest_death(0, [2; 32]);
        assert_eq!(
            contract.get_trust(0).unwrap().status,
            TrustStatus::Active,
            "two attestations are not a quorum"
        );

        set_caller(account("pastor.near"));
        contract.attest_death(0, [3; 32]);

        assert_eq!(
            contract.get_trust(0).unwrap().status,
            TrustStatus::DeathClaimed {
                claimed_at: U64(0),
                ends_at: U64(NS_PER_MONTH),
            }
        );
        assert!(get_logs().iter().any(|log| log.contains("death_attested")));
    }

    #[test]
    #[should_panic(expected = "E17_ALREADY_ATTESTED")]
    fn a_guardian_cannot_attest_twice() {
        env_for("aunt.near", 0);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());
        contract.attest_death(0, [1; 32]);
        contract.attest_death(0, [1; 32]);
    }

    #[test]
    #[should_panic(expected = "E03_NOT_GUARDIAN")]
    fn non_guardian_cannot_attest() {
        env_for("stranger.near", 0);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());
        contract.attest_death(0, [1; 32]);
    }

    #[test]
    #[should_panic(expected = "E13_CLAIM_PENDING")]
    fn no_attestation_while_a_claim_is_pending() {
        env_for("aunt.near", 0);
        let mut contract = Contract::new(None);
        let mut trust = active_trust();
        trust.status = TrustStatus::DeathClaimed {
            claimed_at: U64(0),
            ends_at: U64(1),
        };
        insert_trust(&mut contract, trust);
        contract.attest_death(0, [1; 32]);
    }

    #[test]
    fn one_approval_executes_a_payee_payment() {
        env_for("aunt.near", 0);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());
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

        contract.approve(0);

        assert_eq!(
            contract.get_requests(0, None, None)[0].status,
            RequestStatus::Executed
        );
        assert_eq!(
            contract.get_trust(0).unwrap().balance,
            U128(2_000_000_000 - 10_000)
        );
        assert_eq!(get_created_receipts()[0].receiver_id, account("tusdc.near"));
    }

    #[test]
    fn two_circle_rejections_reject() {
        env_for("aunt.near", 0);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());
        insert_request(
            &mut contract,
            request(
                0,
                RequestKind::LargeSpend {
                    to: account("uncle.near"),
                    amount: U128(10_000),
                },
            ),
        );

        contract.reject(0);
        set_caller(account("teacher.near"));
        contract.reject(0);

        assert_eq!(
            contract.get_requests(0, None, None)[0].status,
            RequestStatus::Rejected
        );
        assert_eq!(contract.get_trust(0).unwrap().balance, U128(2_000_000_000));
    }

    #[test]
    fn one_circle_of_rejections_keeps_the_request_pending() {
        env_for("aunt.near", 0);
        let mut contract = Contract::new(None);
        let mut trust = active_trust();
        trust.guardians = vec![
            guardian("aunt.near", Circle::Maternal),
            guardian("granny.near", Circle::Maternal),
            guardian("teacher.near", Circle::Institution),
        ];
        insert_trust(&mut contract, trust);
        insert_request(
            &mut contract,
            request(
                0,
                RequestKind::LargeSpend {
                    to: account("uncle.near"),
                    amount: U128(10_000),
                },
            ),
        );

        contract.reject(0);
        set_caller(account("granny.near"));
        contract.reject(0);

        assert_eq!(
            contract.get_requests(0, None, None)[0].status,
            RequestStatus::Pending
        );
    }

    #[test]
    #[should_panic(expected = "E21_ALREADY_VOTED")]
    fn a_guardian_cannot_vote_twice() {
        env_for("aunt.near", 0);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());
        insert_request(
            &mut contract,
            request(
                0,
                RequestKind::LargeSpend {
                    to: account("uncle.near"),
                    amount: U128(10_000),
                },
            ),
        );

        contract.reject(0);
        contract.approve(0);
    }

    #[test]
    #[should_panic(expected = "E38_REQUEST_NOT_PENDING")]
    fn approving_a_rejected_request_fails() {
        env_for("aunt.near", 0);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());
        let mut stored = request(0, RequestKind::Unpause);
        stored.rejections = vec![
            approval("aunt.near", Circle::Maternal),
            approval("teacher.near", Circle::Institution),
        ];
        stored.status = RequestStatus::Rejected;
        insert_request(&mut contract, stored);

        contract.approve(0);
    }

    #[test]
    fn pause_sets_the_flag() {
        env_for("aunt.near", 0);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());

        contract.pause(0);

        assert!(contract.get_trust(0).unwrap().paused);
        assert!(get_logs().iter().any(|log| log.contains("trust_paused")));
    }

    #[test]
    #[should_panic(expected = "E03_NOT_GUARDIAN")]
    fn non_guardian_cannot_pause() {
        env_for("stranger.near", 0);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());
        contract.pause(0);
    }

    #[test]
    #[should_panic(expected = "E12_INVALID_STATUS")]
    fn cannot_pause_a_funding_trust() {
        env_for("aunt.near", 0);
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust(0));
        contract.pause(0);
    }

    #[test]
    fn unpause_request_executes_while_paused() {
        env_for("aunt.near", 0);
        let mut contract = Contract::new(None);
        let mut trust = active_trust();
        trust.paused = true;
        insert_trust(&mut contract, trust);
        insert_request(&mut contract, request(0, RequestKind::Unpause));

        contract.approve(0);
        set_caller(account("teacher.near"));
        contract.approve(0);

        assert!(!contract.get_trust(0).unwrap().paused);
        assert_eq!(
            contract.get_requests(0, None, None)[0].status,
            RequestStatus::Executed
        );
    }

    #[test]
    fn other_requests_wait_while_paused() {
        env_for("aunt.near", 0);
        let mut contract = Contract::new(None);
        let mut trust = active_trust();
        trust.paused = true;
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

        contract.approve(0);

        let stored = contract.get_requests(0, None, None)[0].clone();
        assert_eq!(stored.status, RequestStatus::Approved);
        assert_eq!(contract.get_trust(0).unwrap().balance, U128(2_000_000_000));
        assert!(get_created_receipts().is_empty());
        assert_eq!(stored.approvals.len(), 1);
    }
}
