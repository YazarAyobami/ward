//! Executes approved requests (internal). (W-3.6, W-3.10)

use near_sdk::json_types::U128;
use near_sdk::{env, require, AccountId};

use crate::errors;
use crate::events::{self, WardEvent};
use crate::rules;
use crate::token::STORAGE_DEPOSIT;
use crate::types::{RequestId, RequestKind, RequestStatus, Trust, TrustStatus};
use crate::Contract;

impl Contract {
    /// PayeePayment / LargeSpend → transfer; SetChildAccount → storage_deposit + set;
    /// ChildDeceased → redistribute share; Unpause → paused=false; VouchCancel → unlock 2nd cancel.
    pub(crate) fn execute_request(&mut self, request_id: RequestId) {
        let mut request = self.request_or_panic(request_id);
        if request.status != RequestStatus::Approved {
            return;
        }
        let mut trust = self.trust_or_panic(request.trust_id);
        if trust.paused && !matches!(request.kind, RequestKind::Unpause) {
            return;
        }

        let trust_id = trust.id;
        let token = trust.token.clone();
        let mut payouts: Vec<(AccountId, u128, Option<RequestId>)> = Vec::new();
        let mut registrations: Vec<AccountId> = Vec::new();

        match request.kind.clone() {
            RequestKind::PayeePayment { payee, amount } => {
                require!(amount.0 > 0, errors::E32_INVALID_AMOUNT);
                require!(
                    trust
                        .payees
                        .iter()
                        .any(|registered| registered.account == payee),
                    errors::E20_NOT_A_PAYEE
                );
                take_balance(&mut trust, amount.0);
                payouts.push((payee, amount.0, Some(request_id)));
            }
            RequestKind::LargeSpend { to, amount } => {
                require!(amount.0 > 0, errors::E32_INVALID_AMOUNT);
                take_balance(&mut trust, amount.0);
                payouts.push((to, amount.0, Some(request_id)));
            }
            RequestKind::SetChildAccount { child, account } => {
                let index = child_index(&trust, child);
                require!(
                    trust.ops_balance >= STORAGE_DEPOSIT,
                    errors::E39_INSUFFICIENT_OPS_BALANCE
                );
                trust.ops_balance = trust.ops_balance.saturating_sub(STORAGE_DEPOSIT);
                trust.children[index].account = Some(account.clone());
                registrations.push(account);
            }
            RequestKind::ChildDeceased { child } => {
                let index = child_index(&trust, child);
                require!(trust.children[index].alive, errors::E12_INVALID_STATUS);
                distribute_deceased_share(&mut trust, index, &mut payouts);
                events::emit(WardEvent::ChildDeceased { trust_id, child });
            }
            RequestKind::Unpause => {
                trust.paused = false;
                events::emit(WardEvent::TrustUnpaused { trust_id });
            }
            RequestKind::VouchCancel => {
                trust.cancel_window = None;
            }
        }

        request.status = RequestStatus::Executed;
        self.requests.insert(request_id, request);
        self.save_trust(trust.clone());
        events::emit(WardEvent::RequestExecuted { request_id });

        for (receiver, amount, linked) in payouts {
            let _ = self.payout(token.clone(), receiver, U128(amount), trust_id, linked);
        }
        for account in registrations {
            let _ = self.storage_deposit(token.clone(), account);
        }
    }
}

fn take_balance(trust: &mut Trust, amount: u128) {
    require!(amount <= trust.balance.0, errors::E23_INSUFFICIENT_BALANCE);
    trust.balance = U128(trust.balance.0 - amount);
}

fn child_index(trust: &Trust, child: u8) -> usize {
    let index = usize::from(child);
    if trust.children.get(index).is_none() {
        env::panic_str(errors::E36_CHILD_NOT_FOUND);
    }
    index
}

/// Siblings inherit the dead child's bps pro rata; without siblings the remaining share is
/// split equally between the fallback accounts. A failed fallback transfer leaves the funds in
/// the trust, where the remaining shares scale up automatically.
fn distribute_deceased_share(
    trust: &mut Trust,
    index: usize,
    payouts: &mut Vec<(AccountId, u128, Option<RequestId>)>,
) {
    let living: Vec<usize> = trust
        .children
        .iter()
        .enumerate()
        .filter(|(position, child)| *position != index && child.alive)
        .map(|(position, _)| position)
        .collect();

    if living.is_empty() {
        let share = rules::remaining_share(trust, index);
        trust.children[index].alive = false;
        trust.children[index].share_bps = 0;
        let fallback_len = trust.rules.fallback.len();
        if share > 0 && fallback_len > 0 {
            take_balance(trust, share);
            let per_account = share / u128::try_from(fallback_len).unwrap_or(1);
            let mut sent = 0u128;
            for (position, account) in trust.rules.fallback.iter().enumerate() {
                let amount = if position + 1 == fallback_len {
                    share - sent
                } else {
                    per_account
                };
                sent += amount;
                payouts.push((account.clone(), amount, None));
            }
        }
        maybe_close(trust);
        return;
    }

    let moved = u32::from(trust.children[index].share_bps);
    trust.children[index].alive = false;
    trust.children[index].share_bps = 0;
    let total_living: u32 = living
        .iter()
        .map(|&sibling| u32::from(trust.children[sibling].share_bps))
        .sum();
    let sibling_count = u32::try_from(living.len()).unwrap_or(u32::MAX);
    let mut assigned = 0u32;
    for (position, &sibling) in living.iter().enumerate() {
        let add = if position + 1 == living.len() {
            moved - assigned
        } else if total_living == 0 {
            moved / sibling_count
        } else {
            (moved * u32::from(trust.children[sibling].share_bps))
                .checked_div(total_living)
                .unwrap_or(0)
        };
        assigned += add;
        trust.children[sibling].share_bps += u16::try_from(add).expect("shares stay within u16");
    }
    maybe_close(trust);
}

/// Closes the trust once the balance is zero and every living child has all its tranches.
fn maybe_close(trust: &mut Trust) {
    if !matches!(trust.status, TrustStatus::Active | TrustStatus::Graduating) {
        return;
    }
    let all_done = trust
        .children
        .iter()
        .all(|child| !child.alive || child.tranches_paid >= trust.rules.graduation_tranches);
    if trust.balance.0 == 0 && all_done {
        trust.status = TrustStatus::Closed;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{account, insert_request, insert_trust, request, trust};
    use crate::types::{CancelWindow, TrustStatus};
    use near_sdk::json_types::U64;
    use near_sdk::test_utils::{get_created_receipts, get_logs, VMContextBuilder};
    use near_sdk::{testing_env, NearToken};

    fn env_for(caller: &str) {
        testing_env!(VMContextBuilder::new()
            .predecessor_account_id(account(caller))
            .signer_account_id(account(caller))
            .build());
    }

    fn approved(mut stored: crate::types::Request) -> crate::types::Request {
        stored.status = RequestStatus::Approved;
        stored
    }

    fn active_trust() -> Trust {
        let mut trust = trust(0);
        trust.status = TrustStatus::Active;
        trust.activated_at = Some(U64(0));
        trust
    }

    #[test]
    fn payee_payment_transfers_to_the_registered_payee() {
        env_for("ward.near");
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());
        insert_request(
            &mut contract,
            approved(request(
                0,
                RequestKind::PayeePayment {
                    payee: account("school.near"),
                    amount: U128(10_000),
                },
            )),
        );

        contract.execute_request(0);

        assert_eq!(
            contract.get_trust(0).unwrap().balance,
            U128(2_000_000_000 - 10_000)
        );
        let receipts = get_created_receipts();
        assert_eq!(receipts[0].receiver_id, account("tusdc.near"));
        assert!(get_logs()
            .iter()
            .any(|log| log.contains("request_executed")));
    }

    #[test]
    #[should_panic(expected = "E20_NOT_A_PAYEE")]
    fn payee_payment_rejects_an_unregistered_payee() {
        env_for("ward.near");
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());
        insert_request(
            &mut contract,
            approved(request(
                0,
                RequestKind::PayeePayment {
                    payee: account("stranger.near"),
                    amount: U128(10_000),
                },
            )),
        );
        contract.execute_request(0);
    }

    #[test]
    #[should_panic(expected = "E23_INSUFFICIENT_BALANCE")]
    fn payment_more_than_the_balance_fails() {
        env_for("ward.near");
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());
        insert_request(
            &mut contract,
            approved(request(
                0,
                RequestKind::LargeSpend {
                    to: account("uncle.near"),
                    amount: U128(2_000_000_001),
                },
            )),
        );
        contract.execute_request(0);
    }

    #[test]
    fn large_spend_transfers_to_the_target() {
        env_for("ward.near");
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());
        insert_request(
            &mut contract,
            approved(request(
                0,
                RequestKind::LargeSpend {
                    to: account("uncle.near"),
                    amount: U128(500_000_000),
                },
            )),
        );

        contract.execute_request(0);

        assert_eq!(contract.get_trust(0).unwrap().balance, U128(1_500_000_000));
    }

    #[test]
    fn set_child_account_registers_the_account() {
        env_for("ward.near");
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());
        insert_request(
            &mut contract,
            approved(request(
                0,
                RequestKind::SetChildAccount {
                    child: 0,
                    account: account("ada.near"),
                },
            )),
        );

        contract.execute_request(0);

        let stored = contract.get_trust(0).unwrap();
        assert_eq!(stored.children[0].account, Some(account("ada.near")));
        assert_eq!(
            stored.ops_balance,
            NearToken::from_millinear(100).saturating_sub(STORAGE_DEPOSIT)
        );
        let receipts = get_created_receipts();
        assert_eq!(receipts[0].receiver_id, account("tusdc.near"));
    }

    #[test]
    #[should_panic(expected = "E39_INSUFFICIENT_OPS_BALANCE")]
    fn set_child_account_needs_ops_balance() {
        env_for("ward.near");
        let mut contract = Contract::new(None);
        let mut trust = active_trust();
        trust.ops_balance = NearToken::from_yoctonear(0);
        insert_trust(&mut contract, trust);
        insert_request(
            &mut contract,
            approved(request(
                0,
                RequestKind::SetChildAccount {
                    child: 0,
                    account: account("ada.near"),
                },
            )),
        );
        contract.execute_request(0);
    }

    #[test]
    fn deceased_child_share_moves_to_the_sibling() {
        env_for("ward.near");
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());
        insert_request(
            &mut contract,
            approved(request(0, RequestKind::ChildDeceased { child: 0 })),
        );

        contract.execute_request(0);

        let stored = contract.get_trust(0).unwrap();
        assert!(!stored.children[0].alive);
        assert_eq!(stored.children[0].share_bps, 0);
        assert_eq!(stored.children[1].share_bps, 10_000);
        assert_eq!(stored.balance, U128(2_000_000_000));
        assert!(get_logs().iter().any(|log| log.contains("child_deceased")));
    }

    #[test]
    fn deceased_children_split_between_three_siblings() {
        env_for("ward.near");
        let mut contract = Contract::new(None);
        let mut trust = active_trust();
        trust.children = vec![
            crate::test_utils::child("Ada", 4_000, 0),
            crate::test_utils::child("Tobi", 3_000, 0),
            crate::test_utils::child("Kemi", 3_000, 0),
        ];
        insert_trust(&mut contract, trust);
        insert_request(
            &mut contract,
            approved(request(0, RequestKind::ChildDeceased { child: 0 })),
        );

        contract.execute_request(0);

        let stored = contract.get_trust(0).unwrap();
        assert_eq!(stored.children[1].share_bps, 5_000);
        assert_eq!(stored.children[2].share_bps, 5_000);
    }

    #[test]
    fn deceased_child_without_siblings_pays_the_fallback() {
        env_for("ward.near");
        let mut contract = Contract::new(None);
        let mut trust = active_trust();
        trust.children = vec![crate::test_utils::child("Ada", 10_000, 0)];
        insert_trust(&mut contract, trust);
        insert_request(
            &mut contract,
            approved(request(0, RequestKind::ChildDeceased { child: 0 })),
        );

        contract.execute_request(0);

        let stored = contract.get_trust(0).unwrap();
        assert!(!stored.children[0].alive);
        assert_eq!(stored.children[0].share_bps, 0);
        assert_eq!(stored.balance, U128(0));
        assert_eq!(stored.status, TrustStatus::Closed);
        let receipts = get_created_receipts();
        assert_eq!(receipts[0].receiver_id, account("tusdc.near"));
    }

    #[test]
    #[should_panic(expected = "E36_CHILD_NOT_FOUND")]
    fn deceased_rejects_an_unknown_child() {
        env_for("ward.near");
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, active_trust());
        insert_request(
            &mut contract,
            approved(request(0, RequestKind::ChildDeceased { child: 9 })),
        );
        contract.execute_request(0);
    }

    #[test]
    fn unpause_request_clears_the_flag() {
        env_for("ward.near");
        let mut contract = Contract::new(None);
        let mut trust = active_trust();
        trust.paused = true;
        insert_trust(&mut contract, trust);
        insert_request(&mut contract, approved(request(0, RequestKind::Unpause)));

        contract.execute_request(0);

        assert!(!contract.get_trust(0).unwrap().paused);
        assert!(get_logs().iter().any(|log| log.contains("trust_unpaused")));
    }

    #[test]
    fn vouch_cancel_clears_the_window() {
        env_for("ward.near");
        let mut contract = Contract::new(None);
        let mut trust = active_trust();
        trust.cancel_window = Some(CancelWindow {
            cancels: 1,
            window_end: U64(100),
        });
        insert_trust(&mut contract, trust);
        insert_request(
            &mut contract,
            approved(request(0, RequestKind::VouchCancel)),
        );

        contract.execute_request(0);

        assert!(contract.get_trust(0).unwrap().cancel_window.is_none());
    }

    #[test]
    fn paused_trust_defers_spending_requests() {
        env_for("ward.near");
        let mut contract = Contract::new(None);
        let mut trust = active_trust();
        trust.paused = true;
        insert_trust(&mut contract, trust);
        insert_request(
            &mut contract,
            approved(request(
                0,
                RequestKind::PayeePayment {
                    payee: account("school.near"),
                    amount: U128(10_000),
                },
            )),
        );

        contract.execute_request(0);

        assert_eq!(contract.get_trust(0).unwrap().balance, U128(2_000_000_000));
        assert_eq!(
            contract.get_requests(0, None, None)[0].status,
            RequestStatus::Approved
        );
        assert!(get_created_receipts().is_empty());
    }

    #[test]
    fn pending_requests_are_not_executed() {
        env_for("ward.near");
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

        contract.execute_request(0);

        assert_eq!(contract.get_trust(0).unwrap().balance, U128(2_000_000_000));
        assert_eq!(
            contract.get_requests(0, None, None)[0].status,
            RequestStatus::Pending
        );
    }
}
