//! Views. (W-2.11)

use near_sdk::json_types::U128;
use near_sdk::{near, AccountId};

use crate::types::{ChildStatus, Request, Trust, TrustId};
use crate::{Contract, ContractExt};

const DEFAULT_LIMIT: usize = 50;

#[near]
impl Contract {
    pub fn get_trust(&self, trust_id: TrustId) -> Option<Trust> {
        self.trusts.get(&trust_id).cloned()
    }

    pub fn get_trusts_for(&self, account: AccountId) -> Vec<Trust> {
        let ids = self.by_account.get(&account).cloned().unwrap_or_default();
        ids.iter()
            .filter_map(|id| self.trusts.get(id))
            .cloned()
            .collect()
    }

    /// Paginated by insertion order; `from_index` and `limit` are optional.
    pub fn get_requests(
        &self,
        trust_id: TrustId,
        from_index: Option<u64>,
        limit: Option<u64>,
    ) -> Vec<Request> {
        let from = usize::try_from(from_index.unwrap_or(0)).unwrap_or(usize::MAX);
        let limit = usize::try_from(limit.unwrap_or(DEFAULT_LIMIT as u64)).unwrap_or(DEFAULT_LIMIT);
        self.requests
            .iter()
            .filter(|(_, request)| request.trust_id == trust_id)
            .skip(from)
            .take(limit)
            .map(|(_, request)| request.clone())
            .collect()
    }

    pub fn get_child_status(&self, trust_id: TrustId, child_idx: u8) -> ChildStatus {
        let _ = (trust_id, child_idx);
        todo!("W-2.11 wave 3")
    }

    pub fn get_allowance_due(&self, trust_id: TrustId) -> U128 {
        let _ = trust_id;
        todo!("W-2.11 wave 3")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{
        account, insert_request, insert_trust, insert_trust_for, request, set_caller, trust,
    };
    use crate::types::RequestKind;

    fn contract_with_trusts() -> Contract {
        set_caller(account("settlor.near"));
        let mut contract = Contract::new(None);
        insert_trust(&mut contract, trust(0));
        insert_trust(&mut contract, trust(1));
        insert_trust_for(&mut contract, account("settlor.near"), 0);
        insert_trust_for(&mut contract, account("settlor.near"), 1);
        insert_trust_for(&mut contract, account("caregiver.near"), 1);
        contract
    }

    #[test]
    fn get_trust_returns_none_for_missing_id() {
        let contract = contract_with_trusts();
        assert_eq!(contract.get_trust(0), Some(trust(0)));
        assert_eq!(contract.get_trust(9), None);
    }

    #[test]
    fn get_trusts_for_reads_the_account_index() {
        let contract = contract_with_trusts();
        assert_eq!(
            contract.get_trusts_for(account("settlor.near")),
            vec![trust(0), trust(1)]
        );
        assert_eq!(
            contract.get_trusts_for(account("caregiver.near")),
            vec![trust(1)]
        );
        assert!(contract.get_trusts_for(account("stranger.near")).is_empty());
    }

    #[test]
    fn get_requests_filters_by_trust_and_paginates() {
        let mut contract = contract_with_trusts();
        for id in 0..5 {
            let mut req = request(0, RequestKind::Unpause);
            req.id = id;
            insert_request(&mut contract, req);
        }
        for id in 5..7 {
            let mut req = request(1, RequestKind::Unpause);
            req.id = id;
            insert_request(&mut contract, req);
        }

        let first_page = contract.get_requests(0, None, Some(2));
        assert_eq!(
            first_page.iter().map(|r| r.id).collect::<Vec<_>>(),
            vec![0, 1]
        );

        let second_page = contract.get_requests(0, Some(3), Some(2));
        assert_eq!(
            second_page.iter().map(|r| r.id).collect::<Vec<_>>(),
            vec![3, 4]
        );

        let other_trust = contract.get_requests(1, None, None);
        assert_eq!(
            other_trust.iter().map(|r| r.id).collect::<Vec<_>>(),
            vec![5, 6]
        );
    }
}
