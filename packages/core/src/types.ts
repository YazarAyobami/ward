// TS mirror of contracts/ward/src/types.rs (ARCHITECTURE §4). Change both together.
// JSON: U128/U64 are decimal strings; NearToken is a yoctoNEAR string; Option<T> is T | null.
import { z } from "zod";

export const U128 = z.string().regex(/^\d+$/);
export const U64 = z.string().regex(/^\d+$/);
export const AccountId = z.string().min(2).max(64);
export const CryptoHash = z.array(z.number().int().min(0).max(255)).length(32);
export const BasisPoints = z.number().int().min(0).max(10_000);

export const Circle = z.enum(["Maternal", "Paternal", "Community", "Institution"]);

export const TrustStatus = z.union([
  z.literal("Funding"),
  z.object({ DeathClaimed: z.object({ claimed_at: U64, ends_at: U64 }) }),
  z.literal("Active"),
  z.literal("Graduating"),
  z.literal("Closed"),
]);

export const Guardian = z.object({ account: AccountId, circle: Circle });

export const Child = z.object({
  label: z.string(),
  account: AccountId.nullable(),
  birth_ts: U64,
  share_bps: BasisPoints,
  paid_out: U128,
  tranches_paid: z.number().int(),
  alive: z.boolean(),
});

export const PayeeKind = z.enum(["School", "Clinic", "Landlord", "Other"]);
export const Payee = z.object({ account: AccountId, label: z.string(), kind: PayeeKind });

export const Rules = z.object({
  allowance_amount: U128,
  allowance_period: U64,
  large_threshold: U128,
  death_quorum: z.number().int(),
  waiting_period: U64,
  withdraw_free_cap: U128,
  withdraw_delay: U64,
  cancel_window: U64,
  graduation_tranches: z.number().int(),
  max_open_requests: z.number().int(),
  flag_age_years: z.number().int(),
  majority_age_years: z.number().int(),
  fallback: z.array(AccountId),
  time_scale: z.number().int().positive(),
});

export const Approval = z.object({ account: AccountId, circle: Circle });
export const DeathAttestation = z.object({ guardian: AccountId, evidence_hash: CryptoHash, at: U64 });
export const PendingWithdrawal = z.object({
  amount: U128, requested_at: U64, execute_after: U64, vetoes: z.array(Approval),
});
export const CancelWindow = z.object({ cancels: z.number().int(), window_end: U64 });

export const Trust = z.object({
  id: z.number().int(),
  label: z.string(),
  settlor: AccountId,
  dao: AccountId.nullable(),
  caregiver: AccountId,
  caregiver_circle: Circle,
  guardians: z.array(Guardian),
  children: z.array(Child),
  payees: z.array(Payee),
  rules: Rules,
  token: AccountId,
  balance: U128,
  ops_balance: U128,
  status: TrustStatus,
  paused: z.boolean(),
  death_attestations: z.array(DeathAttestation),
  cancel_window: CancelWindow.nullable(),
  pending_withdrawal: PendingWithdrawal.nullable(),
  free_withdrawn: U128,
  free_period_start: U64,
  allowance_claimed_until: U64,
  activated_at: U64.nullable(),
  activation_balance: U128.nullable(),
  created_at: U64,
});

export const RequestKind = z.union([
  z.object({ PayeePayment: z.object({ payee: AccountId, amount: U128 }) }),
  z.object({ LargeSpend: z.object({ to: AccountId, amount: U128 }) }),
  z.object({ SetChildAccount: z.object({ child: z.number().int(), account: AccountId }) }),
  z.object({ ChildDeceased: z.object({ child: z.number().int() }) }),
  z.literal("Unpause"),
  z.literal("VouchCancel"),
]);

export const RequestStatus = z.enum(["Pending", "Approved", "Rejected", "Executed"]);
export const AiReview = z.object({ verdict: z.string(), report_hash: CryptoHash, signing_address: z.string() });

export const Request = z.object({
  id: z.number().int(),
  trust_id: z.number().int(),
  kind: RequestKind,
  created_by: AccountId,
  reason: z.string(),
  receipt_hash: CryptoHash.nullable(),
  ai_review: AiReview.nullable(),
  approvals: z.array(Approval),
  rejections: z.array(Approval),
  child_flagged: z.boolean(),
  status: RequestStatus,
  created_at: U64,
});

export const ChildInput = z.object({ label: z.string(), birth_ts: U64, share_bps: BasisPoints });
export const ChildStatus = z.object({
  age_years: z.number().int(),
  can_flag: z.boolean(),
  can_graduate: z.boolean(),
  remaining_share: U128,
  tranches_left: z.number().int(),
});

export type Circle = z.infer<typeof Circle>;
export type TrustStatus = z.infer<typeof TrustStatus>;
export type Guardian = z.infer<typeof Guardian>;
export type Child = z.infer<typeof Child>;
export type Payee = z.infer<typeof Payee>;
export type Rules = z.infer<typeof Rules>;
export type Approval = z.infer<typeof Approval>;
export type Trust = z.infer<typeof Trust>;
export type RequestKind = z.infer<typeof RequestKind>;
export type Request = z.infer<typeof Request>;
export type ChildInput = z.infer<typeof ChildInput>;
export type ChildStatus = z.infer<typeof ChildStatus>;
