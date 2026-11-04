//! PURE rule engine: no `env::` calls. (W-2.4)
//! Mirrored in `packages/core/src/rules.ts` for UI previews: change both together.

use near_sdk::AccountId;

use crate::errors;
use crate::types::{Approval, ChildInput, Circle, Guardian, Request, RequestKind, Trust};

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

/// 3..=5 guardians, ≤2 per circle, ≥2 circles, caregiver not a guardian (E07–E09, E11).
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
    let _ = (trust, request);
    todo!("W-2.4 wave 2")
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
    let _ = (trust, now_ns);
    todo!("W-2.4 wave 2")
}

/// Remaining share for a child, scaled by spends since activation.
pub fn remaining_share(trust: &Trust, child_idx: usize) -> u128 {
    let _ = (trust, child_idx);
    todo!("W-2.4 wave 2")
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
    use crate::types::RequestStatus;

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
}
