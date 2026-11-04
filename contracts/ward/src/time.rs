//! The ONLY place durations and ages are computed. Applies `Rules::time_scale`. (W-2.3)

pub const NS_PER_SECOND: u64 = 1_000_000_000;
pub const NS_PER_DAY: u64 = 86_400 * NS_PER_SECOND;
pub const NS_PER_MONTH: u64 = 30 * NS_PER_DAY;
pub const NS_PER_YEAR: u64 = 365 * NS_PER_DAY;

pub fn scaled(duration_ns: u64, time_scale: u32) -> u64 {
    let _ = (duration_ns, time_scale);
    todo!("W-2.3")
}

/// Age in whole years, with time scaling applied to elapsed time since birth.
pub fn age_years(birth_ns: u64, now_ns: u64, time_scale: u32) -> u8 {
    let _ = (birth_ns, now_ns, time_scale);
    todo!("W-2.3")
}

pub fn periods_elapsed(from_ns: u64, to_ns: u64, period_ns: u64, time_scale: u32) -> u64 {
    let _ = (from_ns, to_ns, period_ns, time_scale);
    todo!("W-2.3")
}
