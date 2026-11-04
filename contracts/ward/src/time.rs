//! The ONLY place durations and ages are computed. Applies `Rules::time_scale`. (W-2.3)
//!
//! Conventions (ARCHITECTURE §7):
//! - Rule durations are conceptual nanoseconds, e.g. `NS_PER_MONTH`.
//! - `scaled` turns a conceptual duration into chain nanoseconds (divide by `time_scale`).
//! - `age_years` and `periods_elapsed` turn chain elapsed time back into conceptual time
//!   (multiply by `time_scale`).
//! - `time_scale` 1 means real time; 0 is treated as 1 so a bad rule can never divide by zero.

pub const NS_PER_SECOND: u64 = 1_000_000_000;
pub const NS_PER_DAY: u64 = 86_400 * NS_PER_SECOND;
pub const NS_PER_MONTH: u64 = 30 * NS_PER_DAY;
pub const NS_PER_YEAR: u64 = 365 * NS_PER_DAY;

fn effective_scale(time_scale: u32) -> u64 {
    u64::from(time_scale.max(1))
}

/// Conceptual duration → chain duration.
pub fn scaled(duration_ns: u64, time_scale: u32) -> u64 {
    duration_ns / effective_scale(time_scale)
}

/// Age in whole years, with time scaling applied to elapsed time since birth.
pub fn age_years(birth_ns: u64, now_ns: u64, time_scale: u32) -> u8 {
    let elapsed_ns = now_ns.saturating_sub(birth_ns);
    let conceptual_ns = elapsed_ns.saturating_mul(effective_scale(time_scale));
    u8::try_from(conceptual_ns / NS_PER_YEAR).unwrap_or(u8::MAX)
}

/// Whole periods between two chain timestamps. `period_ns` is conceptual.
pub fn periods_elapsed(from_ns: u64, to_ns: u64, period_ns: u64, time_scale: u32) -> u64 {
    if period_ns == 0 {
        return 0;
    }
    let period_chain_ns = scaled(period_ns, time_scale).max(1);
    to_ns.saturating_sub(from_ns) / period_chain_ns
}

#[cfg(test)]
mod tests {
    use super::*;

    const DEMO_SCALE: u32 = 43_200;

    #[test]
    fn scaled_divides_by_time_scale() {
        assert_eq!(scaled(NS_PER_MONTH, 1), NS_PER_MONTH);
        assert_eq!(scaled(NS_PER_MONTH, DEMO_SCALE), NS_PER_SECOND * 60);
        assert_eq!(scaled(NS_PER_DAY, 2), NS_PER_DAY / 2);
    }

    #[test]
    fn scaled_treats_zero_scale_as_one() {
        assert_eq!(scaled(NS_PER_SECOND, 0), NS_PER_SECOND);
    }

    #[test]
    fn age_years_boundaries() {
        let birth = 100 * NS_PER_YEAR;
        assert_eq!(age_years(birth, birth, 1), 0);
        assert_eq!(age_years(birth, birth + NS_PER_YEAR - 1, 1), 0);
        assert_eq!(age_years(birth, birth + NS_PER_YEAR, 1), 1);
        assert_eq!(age_years(birth, birth + 18 * NS_PER_YEAR, 1), 18);
    }

    #[test]
    fn age_years_ignores_time_before_birth() {
        let birth = 10 * NS_PER_YEAR;
        assert_eq!(age_years(birth, birth - NS_PER_YEAR, 1), 0);
    }

    #[test]
    fn age_years_applies_demo_scale() {
        let birth = 0;
        let sixteen_years = 16 * NS_PER_YEAR;
        let chain_ns = sixteen_years / u64::from(DEMO_SCALE);
        assert_eq!(age_years(birth, chain_ns, DEMO_SCALE), 16);
        assert_eq!(age_years(birth, chain_ns - 1, DEMO_SCALE), 15);
    }

    #[test]
    fn age_years_saturates_at_u8_max() {
        assert_eq!(age_years(0, u64::MAX, 1), u8::MAX);
    }

    #[test]
    fn periods_elapsed_counts_whole_periods() {
        let start = 5 * NS_PER_MONTH;
        assert_eq!(periods_elapsed(start, start, NS_PER_MONTH, 1), 0);
        assert_eq!(
            periods_elapsed(start, start + NS_PER_MONTH - 1, NS_PER_MONTH, 1),
            0
        );
        assert_eq!(
            periods_elapsed(start, start + NS_PER_MONTH, NS_PER_MONTH, 1),
            1
        );
        assert_eq!(
            periods_elapsed(start, start + 3 * NS_PER_MONTH, NS_PER_MONTH, 1),
            3
        );
    }

    #[test]
    fn periods_elapsed_applies_demo_scale() {
        let one_month_chain = scaled(NS_PER_MONTH, DEMO_SCALE);
        assert_eq!(
            periods_elapsed(0, one_month_chain, NS_PER_MONTH, DEMO_SCALE),
            1
        );
        assert_eq!(
            periods_elapsed(0, one_month_chain - 1, NS_PER_MONTH, DEMO_SCALE),
            0
        );
    }

    #[test]
    fn periods_elapsed_handles_backwards_time_and_zero_period() {
        assert_eq!(periods_elapsed(NS_PER_MONTH, 0, NS_PER_MONTH, 1), 0);
        assert_eq!(periods_elapsed(0, NS_PER_MONTH, 0, 1), 0);
    }
}
