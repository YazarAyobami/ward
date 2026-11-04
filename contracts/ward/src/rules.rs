//! PURE rule engine: no `env::` calls. (W-2.4)
//! Mirrored in `packages/core/src/rules.ts` for UI previews: change both together.

use near_sdk::AccountId;

use crate::errors;
use crate::time;
use crate::types::{
    Approval, ChildInput, Circle, Guardian, Request, RequestKind, Trust, TrustStatus,
};

const CIRCLE_COUNT: usize = 4;
const SHARES_TOTAL_BPS: u32 = 10_000;

pub fn circle_index(circle: Circle) -> usize {
    match circle {
        Circle::Maternal => 0,
        Circle::Paternal => 1,
        Circle::Community => 2,
        Circle::Institution => 3,
    }
}

/// 3..=5 distinct guardians, ≤2 per circle, ≥2 circles, caregiver not a guardian (E07–E09, E11, E35).
pub fn validate_guardians(
    guardians: &[Guardian],
    caregiver: &AccountId,
) -> Result<(), &'static str> {
    if guardians.len() < 3 || guardians.len() > 5 {
        return Err(errors::E07_GUARDIAN_COUNT);
    }
    if guardians.iter().any(|g| &g.account == caregiver) {
        return Err(errors::E11_CAREGIVER_IS_GUARDIAN);
    }

    // A repeated account would shrink the real quorum while still passing the count check.
    for (index, guardian) in guardians.iter().enumerate() {
        if guardians[index + 1..]
            .iter()
            .any(|other| other.account == guardian.account)
        {
            return Err(errors::E35_DUPLICATE_GUARDIAN);
        }
    }

    let mut per_circle = [0usize; CIRCLE_COUNT];
    for guardian in guardians {
        per_circle[circle_index(guardian.circle)] += 1;
    }
    if per_circle.iter().any(|count| *count > 2) {
        return Err(errors::E08_CIRCLE_LIMIT);
    }
    if per_circle.iter().filter(|count| **count > 0).count() < 2 {
        return Err(errors::E09_CIRCLE_DIVERSITY);
    }
    Ok(())
}

pub fn validate_shares(children: &[ChildInput]) -> Result<(), &'static str> {
    let mut total: u32 = 0;
    for child in children {
        total = total
            .checked_add(u32::from(child.share_bps))
            .ok_or(errors::E10_SHARES_SUM)?;
    }
    if total != SHARES_TOTAL_BPS {
        return Err(errors::E10_SHARES_SUM);
    }
    Ok(())
}

/// Number of distinct circles among approvals.
pub fn distinct_circles(approvals: &[Approval]) -> usize {
    let mut seen = [false; CIRCLE_COUNT];
    for approval in approvals {
        seen[circle_index(approval.circle)] = true;
    }
    seen.iter().filter(|present| **present).count()
}

/// Is the request's approval rule met (ARCHITECTURE §6)?
pub fn is_satisfied(trust: &Trust, request: &Request) -> bool {
    if request.approvals.is_empty() {
        return false;
    }
    match &request.kind {
        RequestKind::PayeePayment { .. } | RequestKind::VouchCancel if !request.child_flagged => {
            true
        }
        RequestKind::LargeSpend { .. } => {
            distinct_circles(&request.approvals) >= 2
                && request
                    .approvals
                    .iter()
                    .any(|approval| approval.circle != trust.caregiver_circle)
        }
        _ => distinct_circles(&request.approvals) >= 2,
    }
}

/// Rejected once 2 rejections from different circles.
pub fn is_rejected(request: &Request) -> bool {
    distinct_circles(&request.rejections) >= 2
}

pub fn requires_two_circles(kind: &RequestKind, child_flagged: bool) -> bool {
    if child_flagged {
        return true;
    }
    match kind {
        RequestKind::PayeePayment { .. } | RequestKind::VouchCancel => false,
        RequestKind::LargeSpend { .. }
        | RequestKind::SetChildAccount { .. }
        | RequestKind::ChildDeceased { .. }
        | RequestKind::Unpause => true,
    }
}

/// Allowance due now (max 1 period of arrears, never above balance).
pub fn allowance_due(trust: &Trust, now_ns: u64) -> u128 {
    if !matches!(trust.status, TrustStatus::Active | TrustStatus::Graduating) {
        return 0;
    }
    if trust.rules.allowance_period.0 == 0 {
        return 0;
    }
    let start_ns = match trust.allowance_claimed_until.0 {
        0 => trust.activated_at.map_or(trust.created_at.0, |at| at.0),
        claimed => claimed,
    };
    let periods = time::periods_elapsed(
        start_ns,
        now_ns,
        trust.rules.allowance_period.0,
        trust.rules.time_scale,
    );
    if periods == 0 {
        return 0;
    }
    trust.rules.allowance_amount.0.min(trust.balance.0)
}

/// Remaining share for a child, scaled by shared spends since activation.
///
/// Shared spends (allowance, approved payments) reduce the common balance, so the child's claim
/// scales with it. Living children's graduation payouts are added back to the pool before applying
/// `share_bps` and each child's own payout is then subtracted: without that, a first-moving sibling
/// would take part of the later sibling's share. A dead child's payouts are not added back; its
/// share has already been redistributed to the living siblings.
pub fn remaining_share(trust: &Trust, child_idx: usize) -> u128 {
    let Some(child) = trust.children.get(child_idx) else {
        return 0;
    };
    if !child.alive {
        return 0;
    }
    let living_paid_out = trust
        .children
        .iter()
        .filter(|stored| stored.alive)
        .fold(0u128, |sum, stored| sum.saturating_add(stored.paid_out.0));
    trust
        .balance
        .0
        .saturating_add(living_paid_out)
        .checked_mul(u128::from(child.share_bps))
        .map(|scaled| scaled / SHARES_TOTAL_BPS as u128)
        .unwrap_or(u128::MAX)
        .saturating_sub(child.paid_out.0)
}

/// Circle of a guardian. The caregiver isn't a guardian (invariant 1).
pub fn circle_of(trust: &Trust, account: &AccountId) -> Option<Circle> {
    trust
        .guardians
        .iter()
        .find(|guardian| &guardian.account == account)
        .map(|guardian| guardian.circle)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{account, approval, child_input, guardian, guardians, request, trust};
    use crate::time::NS_PER_MONTH;
    use crate::types::RequestStatus;
    use near_sdk::json_types::{U128, U64};

    #[test]
    fn accepts_valid_set() {
        let caregivers = account("caregiver.near");
        assert_eq!(validate_guardians(&guardians(), &caregivers), Ok(()));
    }

    #[test]
    fn rejects_fewer_than_three_guardians() {
        let set = vec![
            guardian("aunt.near", Circle::Maternal),
            guardian("uncle.near", Circle::Paternal),
        ];
        assert_eq!(
            validate_guardians(&set, &account("caregiver.near")),
            Err(errors::E07_GUARDIAN_COUNT)
        );
    }

    #[test]
    fn rejects_more_than_five_guardians() {
        let set = vec![
            guardian("g1.near", Circle::Maternal),
            guardian("g2.near", Circle::Paternal),
            guardian("g3.near", Circle::Community),
            guardian("g4.near", Circle::Institution),
            guardian("g5.near", Circle::Maternal),
            guardian("g6.near", Circle::Paternal),
        ];
        assert_eq!(
            validate_guardians(&set, &account("caregiver.near")),
            Err(errors::E07_GUARDIAN_COUNT)
        );
    }

    #[test]
    fn rejects_three_guardians_in_one_circle() {
        let set = vec![
            guardian("g1.near", Circle::Maternal),
            guardian("g2.near", Circle::Maternal),
            guardian("g3.near", Circle::Maternal),
        ];
        assert_eq!(
            validate_guardians(&set, &account("caregiver.near")),
            Err(errors::E08_CIRCLE_LIMIT)
        );
    }

    /// With 3–5 guardians and ≤2 per circle, ≥2 circles holds by construction: E09 is a
    /// defence-in-depth check that a single-circle set never passes, whichever code fires.
    #[test]
    fn rejects_single_circle() {
        let one_circle = vec![
            guardian("g1.near", Circle::Paternal),
            guardian("g2.near", Circle::Paternal),
        ];
        assert!(validate_guardians(&one_circle, &account("caregiver.near")).is_err());

        let three_in_one_circle = vec![
            guardian("g1.near", Circle::Paternal),
            guardian("g2.near", Circle::Paternal),
            guardian("g3.near", Circle::Paternal),
        ];
        assert!(validate_guardians(&three_in_one_circle, &account("caregiver.near")).is_err());
    }

    #[test]
    fn rejects_two_guardians_from_one_circle() {
        let set = vec![
            guardian("g1.near", Circle::Paternal),
            guardian("g2.near", Circle::Paternal),
        ];
        assert_eq!(
            validate_guardians(&set, &account("caregiver.near")),
            Err(errors::E07_GUARDIAN_COUNT)
        );
    }

    #[test]
    fn rejects_caregiver_as_guardian() {
        let caregiver = account("aunt.near");
        assert_eq!(
            validate_guardians(&guardians(), &caregiver),
            Err(errors::E11_CAREGIVER_IS_GUARDIAN)
        );
    }

    #[test]
    fn rejects_the_same_account_twice() {
        let set = vec![
            guardian("aunt.near", Circle::Maternal),
            guardian("uncle.near", Circle::Paternal),
            guardian("aunt.near", Circle::Community),
            guardian("teacher.near", Circle::Institution),
        ];
        assert_eq!(
            validate_guardians(&set, &account("caregiver.near")),
            Err(errors::E35_DUPLICATE_GUARDIAN)
        );
    }

    #[test]
    fn shares_must_sum_to_ten_thousand_bps() {
        let valid = vec![child_input("Ada", 5_000), child_input("Tobi", 5_000)];
        assert_eq!(validate_shares(&valid), Ok(()));

        let short = vec![child_input("Ada", 5_000), child_input("Tobi", 4_999)];
        assert_eq!(validate_shares(&short), Err(errors::E10_SHARES_SUM));

        let over = vec![child_input("Ada", 6_000), child_input("Tobi", 5_000)];
        assert_eq!(validate_shares(&over), Err(errors::E10_SHARES_SUM));

        assert_eq!(validate_shares(&[]), Err(errors::E10_SHARES_SUM));
    }

    #[test]
    fn distinct_circles_counts_unique_circles() {
        let votes = vec![
            approval("g1.near", Circle::Maternal),
            approval("g2.near", Circle::Maternal),
            approval("g3.near", Circle::Paternal),
        ];
        assert_eq!(distinct_circles(&votes), 2);
        assert_eq!(distinct_circles(&[]), 0);
    }

    #[test]
    fn requires_two_circles_by_request_kind() {
        assert!(!requires_two_circles(
            &RequestKind::PayeePayment {
                payee: account("school.near"),
                amount: 1.into()
            },
            false
        ));
        assert!(!requires_two_circles(&RequestKind::VouchCancel, false));
        assert!(requires_two_circles(
            &RequestKind::LargeSpend {
                to: account("uncle.near"),
                amount: 1.into()
            },
            false
        ));
        assert!(requires_two_circles(
            &RequestKind::SetChildAccount {
                child: 0,
                account: account("ada.near")
            },
            false
        ));
        assert!(requires_two_circles(
            &RequestKind::ChildDeceased { child: 0 },
            false
        ));
        assert!(requires_two_circles(&RequestKind::Unpause, false));
        assert!(requires_two_circles(
            &RequestKind::PayeePayment {
                payee: account("school.near"),
                amount: 1.into()
            },
            true
        ));
    }

    #[test]
    fn two_rejections_from_different_circles_reject() {
        let mut req = request(
            0,
            RequestKind::LargeSpend {
                to: account("uncle.near"),
                amount: 1.into(),
            },
        );
        req.rejections = vec![
            approval("g1.near", Circle::Maternal),
            approval("g2.near", Circle::Paternal),
            approval("g3.near", Circle::Paternal),
        ];
        assert!(is_rejected(&req));

        req.rejections = vec![
            approval("g1.near", Circle::Maternal),
            approval("g2.near", Circle::Maternal),
        ];
        assert!(!is_rejected(&req));
    }

    #[test]
    fn circle_of_finds_only_guardians() {
        let trust = trust(0);
        assert_eq!(
            circle_of(&trust, &account("aunt.near")),
            Some(Circle::Maternal)
        );
        assert_eq!(circle_of(&trust, &account("caregiver.near")), None);
        assert_eq!(circle_of(&trust, &account("stranger.near")), None);
    }

    #[test]
    fn request_status_defaults_to_pending() {
        assert_eq!(
            request(0, RequestKind::Unpause).status,
            RequestStatus::Pending
        );
    }

    #[test]
    fn payee_payment_needs_one() {
        let trust = trust(0);
        let mut req = request(
            0,
            RequestKind::PayeePayment {
                payee: account("school.near"),
                amount: U128(1_000),
            },
        );
        assert!(!is_satisfied(&trust, &req));

        req.approvals = vec![approval("pastor.near", Circle::Community)];
        assert!(is_satisfied(&trust, &req));
    }

    #[test]
    fn large_spend_needs_circle_other_than_caregivers() {
        let trust = trust(0); // caregiver_circle = Paternal
        let mut req = request(
            0,
            RequestKind::LargeSpend {
                to: account("uncle.near"),
                amount: U128(1_000),
            },
        );

        req.approvals = vec![
            approval("uncle.near", Circle::Paternal),
            approval("aunt.near", Circle::Paternal),
        ];
        assert!(
            !is_satisfied(&trust, &req),
            "caregiver's circle alone must not satisfy"
        );

        req.approvals = vec![
            approval("uncle.near", Circle::Paternal),
            approval("aunt.near", Circle::Maternal),
        ];
        assert!(is_satisfied(&trust, &req));
    }

    #[test]
    fn flagged_needs_two_circles() {
        let trust = trust(0);
        let mut req = request(
            0,
            RequestKind::PayeePayment {
                payee: account("school.near"),
                amount: U128(1_000),
            },
        );
        req.child_flagged = true;
        req.approvals = vec![approval("pastor.near", Circle::Community)];
        assert!(!is_satisfied(&trust, &req));

        req.approvals
            .push(approval("teacher.near", Circle::Institution));
        assert!(is_satisfied(&trust, &req));
    }

    #[test]
    fn set_child_account_needs_two_circles() {
        let trust = trust(0);
        let mut req = request(
            0,
            RequestKind::SetChildAccount {
                child: 0,
                account: account("ada.near"),
            },
        );
        req.approvals = vec![approval("aunt.near", Circle::Maternal)];
        assert!(!is_satisfied(&trust, &req));

        req.approvals.push(approval("uncle.near", Circle::Maternal));
        assert!(
            !is_satisfied(&trust, &req),
            "two guardians in one circle are not two circles"
        );

        req.approvals
            .push(approval("teacher.near", Circle::Institution));
        assert!(is_satisfied(&trust, &req));
    }

    #[test]
    fn vouch_cancel_needs_one() {
        let trust = trust(0);
        let mut req = request(0, RequestKind::VouchCancel);
        assert!(!is_satisfied(&trust, &req));
        req.approvals = vec![approval("pastor.near", Circle::Community)];
        assert!(is_satisfied(&trust, &req));
    }

    fn active_trust() -> Trust {
        let mut trust = trust(0);
        trust.status = TrustStatus::Active;
        trust.activated_at = Some(U64(0));
        trust.created_at = U64(0);
        trust
    }

    #[test]
    fn allowance_one_period() {
        let trust = active_trust();
        assert_eq!(allowance_due(&trust, 0), 0);
        assert_eq!(allowance_due(&trust, NS_PER_MONTH - 1), 0);
        assert_eq!(allowance_due(&trust, NS_PER_MONTH), 150_000_000);
    }

    #[test]
    fn allowance_max_one_arrears() {
        let trust = active_trust();
        assert_eq!(allowance_due(&trust, 5 * NS_PER_MONTH), 150_000_000);
    }

    #[test]
    fn allowance_never_exceeds_balance() {
        let mut trust = active_trust();
        trust.balance = U128(100);
        assert_eq!(allowance_due(&trust, NS_PER_MONTH), 100);
    }

    #[test]
    fn allowance_works_while_paused() {
        let mut trust = active_trust();
        trust.paused = true;
        assert_eq!(allowance_due(&trust, NS_PER_MONTH), 150_000_000);
    }

    #[test]
    fn allowance_is_zero_before_activation() {
        let trust = trust(0); // Funding
        assert_eq!(allowance_due(&trust, NS_PER_MONTH), 0);
    }

    #[test]
    fn remaining_share_scales_with_spends() {
        let mut trust = trust(0);
        assert_eq!(remaining_share(&trust, 0), 1_000_000_000);

        trust.balance = U128(1_000_000_000);
        assert_eq!(remaining_share(&trust, 0), 500_000_000);
        assert_eq!(remaining_share(&trust, 1), 500_000_000);

        trust.children[1].alive = false;
        assert_eq!(remaining_share(&trust, 1), 0);
        assert_eq!(remaining_share(&trust, 9), 0);
    }

    #[test]
    fn remaining_share_does_not_let_the_first_sibling_take_the_second_share() {
        let mut trust = trust(0);
        trust.children[0].paid_out = U128(333_333_333);
        trust.balance = U128(2_000_000_000 - 333_333_333);

        assert_eq!(remaining_share(&trust, 0), 666_666_667);
        assert_eq!(remaining_share(&trust, 1), 1_000_000_000);
    }

    #[test]
    fn fully_paid_child_has_nothing_left() {
        let mut trust = trust(0);
        trust.children[0].paid_out = U128(1_000_000_000);
        trust.balance = U128(1_000_000_000);

        assert_eq!(remaining_share(&trust, 0), 0);
        assert_eq!(remaining_share(&trust, 1), 1_000_000_000);
    }
}
