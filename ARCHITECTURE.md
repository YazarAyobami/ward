# Ward — Architecture (v2)

> Companion to `PRD.md`. Short version for agents: `ARCHITECTURE_ESSENTIALS.md`.
> v2 (4 Nov 2026) applies the hard-questions review; §14 is the decision log.
> Live task list and status: `ROADMAP.md`. **Update it in every contribution.** File layout: `project_structure.md`.

---

## 1. System overview

```
  Settlor / Guardians /  ┌──────────────────────────────┐
  Caregiver / Child ───► │  Web app (Next.js)           │
                         │  wallet-selector, ledger UI  │
                         └──────┬───────────────┬───────┘
                                │ txs           │ HTTPS
                                ▼               ▼
┌──────────────────────┐  ┌───────────────┐  ┌───────────────────────┐
│ Sputnik DAO          │─►│ ward contract │◄─│ ward-api (Hono)       │
│ (guardian council:   │  │ custody + ALL │  │ - AI receipt check    │
│  membership changes  │  │ spend rules   │  │   (stretch)           │
│  only)               │  └──────┬────────┘  │ - 1Click dry-run quote│
└──────────────────────┘         │ NEP-141   └───────────────────────┘
                                 ▼
                          tUSDC (mock) / USDC
```

### Key decisions
1. **One `ward` contract holds custody and enforces every spend rule.** Many trusts live in it, keyed by `trust_id`.
2. **Circle diversity holds by construction.** There are **at most 2 guardians per circle** and 3–5 guardians in total. Any approval by ≥3 guardians therefore spans ≥2 circles, so a fixed-weight Sputnik threshold of 3 is cross-circle with no extra checks.
3. **Sputnik DAO handles membership changes only:** replacing a guardian, changing the caregiver, and adding a payee. Its vote policy is a fixed weight of 3. It calls `ward.council_*`. Money never moves through a DAO proposal.
4. **Spend approvals live inside Ward.** Guardians call `approve` on requests. Ward checks circles directly (the "≥2 circles, one of them ≠ the caregiver's circle" rule).
5. **A stolen settlor phone is the main threat.** Settlor withdrawals above a free cap are delayed and can be vetoed by guardians. A repeated death-claim cancellation needs a guardian to vouch for the settlor.
6. **Ward pays token storage for every recipient it adds** (payees, child accounts), using a NEAR `ops_balance` the settlor attaches at creation.

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Contract | Rust, `near-sdk` 5.30, `cargo-near` | `ward.<you>.testnet` |
| Tests | `near-workspaces` (sandbox, `fast_forward`), unit tests | Real Sputnik wasm in sandbox, pinned version |
| Approved extra deps (2026-11-04) | `near-contract-standards` 5.30 (mock-ft NEP-141/145) · Vitest 5.1 (web tests) |
| Token | Mock NEP-141 `tusdc.<you>.testnet` (6 dp, implements NEP-145 storage) | Native USDC `17208628f84f5d6974225404428748ba9574650c.factory.bridge.near` / `usdc.near` |
| Council | Sputnik DAO v2. **Demo uses one DAO** shared by the demo trusts | Factory: `sputnik-v2.testnet` / `sputnik-dao.near` |
| Frontend | Next.js 16, TypeScript, Tailwind, `@near-wallet-selector`, `near-api-js` | Vercel |
| Backend | Node 22 + Hono (`ward-api`) | Stretch features only |
| AI (stretch) | NEAR AI Cloud `https://cloud-api.near.ai/v1` | TEE model, attestation + response signature |
| Funding UI | 1Click `POST /v0/quote` with `dry: true` | Display only |
| Monorepo | pnpm workspaces | `contracts/`, `apps/web`, `apps/api`, `scripts/` |

## 3. Repository layout

```
ward/
├── contracts/ward/src/{lib.rs, trust.rs, requests.rs, settlor.rs, council.rs, time.rs, events.rs}
├── contracts/ward/tests/        # near-workspaces
├── contracts/mock-ft/
├── apps/web/                    # /create, /t/[id], /t/[id]/{fund,guardian,caregiver,child}
├── apps/api/                    # AI check + quote proxy (stretch)
├── scripts/demo.ts
├── README.md  LICENSE (MIT)
```

## 4. Data model

```rust
pub type TrustId = u64; pub type RequestId = u64;

pub enum Circle { Maternal, Paternal, Community, Institution }

pub enum TrustStatus {
    Funding,
    DeathClaimed { claimed_at: u64, ends_at: u64 },
    Active,
    Graduating,          // ≥1 child paid out, others pending
    Closed,              // balance 0, all children done
}

pub struct Guardian { account: AccountId, circle: Circle }

pub struct Child {
    label: String,                  // nickname only
    account: Option<AccountId>,     // set via SetChildAccount request (2 circles)
    birth_ts: u64,
    share_bps: u16,                 // fixed share of balance at activation; sum = 10_000
    paid_out: U128,
    tranches_paid: u8,
    alive: bool,                    // set false via ChildDeceased request → share to fallback
}

pub struct Rules {
    allowance_amount: U128, allowance_period: u64,
    large_threshold: U128,          // above → LargeSpend rules
    death_quorum: u8,               // fixed 3 (by construction cross-circle)
    waiting_period: u64,            // demo 2 min; production ≥ 30 days
    withdraw_free_cap: U128,        // settlor can withdraw this per period instantly
    withdraw_delay: u64,            // larger withdrawals wait this long (veto window)
    graduation_tranches: u8,        // default 3, one per allowance_period
    max_open_requests: u8,          // default 5
    flag_age_years: u8, majority_age_years: u8,   // 14, 18
    fallback: Vec<AccountId>,       // if a child dies: siblings first (implicit), then these
    time_scale: u32,                // immutable
}

pub struct PendingWithdrawal { amount: U128, execute_after: u64, vetoes: Vec<(AccountId, Circle)> }

pub struct Trust {
    id: TrustId, settlor: AccountId, dao: Option<AccountId>,
    caregiver: AccountId, caregiver_circle: Circle,
    guardians: Vec<Guardian>,       // 3..=5, ≤2 per circle
    children: Vec<Child>,
    payees: Vec<Payee>,
    rules: Rules, token: AccountId,
    balance: U128,                  // token
    ops_balance: NearToken,         // NEAR for storage_deposit calls
    status: TrustStatus,
    paused: bool,                   // freeze flag; allowance still pays
    death_attestations: Vec<(AccountId, [u8; 32])>,
    cancel_count_window: (u8, u64), // (cancels, window_end) → 2nd cancel needs vouch
    pending_withdrawal: Option<PendingWithdrawal>,
    allowance_claimed_until: u64,
    activated_at: Option<u64>,
}

pub struct Payee { account: AccountId, label: String, kind: PayeeKind }   // School|Clinic|Landlord|Other

pub enum RequestKind {
    PayeePayment { payee: AccountId, amount: U128 },   // 1 guardian
    LargeSpend { to: AccountId, amount: U128 },        // 2 circles, one ≠ caregiver_circle
    SetChildAccount { child: u8, account: AccountId }, // 2 circles
    ChildDeceased { child: u8 },                        // 2 circles
    Unpause,                                            // 2 circles
    VouchCancel,                                        // 1 guardian: settlor is alive
}

pub enum RequestStatus { Pending, Approved, Rejected, Executed }

pub struct Request {
    id: RequestId, trust_id: TrustId, kind: RequestKind,
    created_by: AccountId, reason: String,
    receipt_hash: Option<[u8; 32]>,
    ai_review: Option<AiReview>,             // stretch, advisory
    approvals: Vec<(AccountId, Circle)>, rejections: Vec<AccountId>,
    child_flagged: bool,                      // child ≥14 → needs 2-circle approvals regardless of kind
    status: RequestStatus, created_at: u64,
}
```

## 5. Contract interface

**Settlor**
- `create_trust(caregiver, caregiver_circle, guardians, children, payees, rules, token)` with attached NEAR covering storage plus the `ops_balance`. Validates:
  - 3–5 guardians, ≤2 per circle, ≥2 circles, all distinct accounts.
  - Child shares sum to 100%.
  - The caregiver isn't a guardian.

  It calls `token.storage_deposit` for each payee.
- `ft_on_transfer(msg={"deposit": trust_id})`. Accepts `trust.token` only, and only while the trust is `Funding` (shares are snapshotted at activation).
- `add_child(trust_id, child)` (status `Funding` only; rebalances shares by explicit new shares).
- `set_dao(trust_id, dao)` (once, while `Funding`).
- `withdraw(trust_id, amount)`:
  - Up to `withdraw_free_cap` per period: pays immediately.
  - Otherwise: creates a `PendingWithdrawal` with an event. Vetoes from 2 circles cancel it.
  - Only one withdrawal may be in flight, and withdrawals are blocked while `paused`.
  - `execute_withdrawal` (anyone, after the delay, if not vetoed).
- `cancel_death_claim(trust_id)`. The first cancel within the window works immediately. A second cancel within the window requires a `VouchCancel` approved by 1 guardian. While a claim is pending, `withdraw` is blocked.

**Guardians**
- `attest_death(trust_id, evidence_hash)`. 3 attestations means `DeathClaimed`.
- `finalize_activation(trust_id)` (anyone, after `ends_at`). Snapshots the balance into child shares.
- `approve(request_id)` / `reject(request_id)`: executes when its rule is met. Any 2 rejections from different circles mean `Rejected`.
- `veto_withdrawal(trust_id)`.
- `pause(trust_id)` (any single guardian). Unpausing goes through an `Unpause` request.

**Caregiver**
- `claim_allowance(trust_id)`: at most 1 period of arrears. Works while paused.
- `create_request(trust_id, kind, reason, receipt_hash)`: guardians may also create requests. Limited by `max_open_requests`.

**Child**
- `flag(request_id)` (child account, age ≥ 14).
- `claim_graduation(trust_id, child_idx)` (child account, age ≥ 18). Pays one tranche per period up to `graduation_tranches`. Any guardian can pause in between.

**Council (only `trust.dao`)**
- `council_replace_guardian(trust_id, old, new)`: re-validates the ≤2-per-circle rule.
- `council_set_caregiver(trust_id, account, circle)`.
- `council_add_payee(trust_id, payee)`: calls `storage_deposit` from `ops_balance`.

**Views**
- `get_trust`, `get_trusts_for(account)`, `get_requests(trust_id, from, limit)`, `get_child_status(trust_id, idx)`, `get_allowance_due(trust_id)`.

## 6. Rules engine

| Action | Rule |
|---|---|
| Allowance | Fixed amount per period; at most 1 period of arrears; works while paused |
| PayeePayment | 1 guardian; funds go to the registered payee only |
| LargeSpend | Approvals from ≥2 circles, at least one ≠ `caregiver_circle` |
| SetChildAccount / ChildDeceased / Unpause | Approvals from ≥2 circles |
| Any request flagged by the child | Approvals from ≥2 circles |
| Paused | Only allowance and pause-related requests execute |
| Settlor withdraw ≤ free cap | Immediate |
| Settlor withdraw > free cap | Delay; cancelled by vetoes from 2 circles |
| Death claim | 3 attestations (cross-circle by construction), then the waiting period, then activation |
| 2nd cancel in window | Needs `VouchCancel` (1 guardian) |
| Council membership changes | Sputnik DAO, fixed weight 3, then `council_*`, then Ward re-validates the circle rules |

Each child's share is snapshotted at activation: `share = balance_at_activation × share_bps`. Allowance and approved spends are drawn from the common balance, and each child's remaining share is scaled proportionally. Graduation pays `remaining_share / tranches_left`, where `remaining_share = (balance + living paid_out) × share_bps − paid_out`: living children's payouts are added back to the pool before proportional scaling and each child's own payout is then subtracted, so an earlier graduation does not shrink a sibling's share. A dead child's payouts are not added back; its share has already been redistributed to living siblings. One tranche unlocks per allowance period from activation.

## 7. Time
- **Durations:** `Rules` holds conceptual nanoseconds (e.g. `NS_PER_MONTH`). `time::scaled` divides by `time_scale` wherever a duration becomes a chain deadline. `time::age_years` and `time::periods_elapsed` multiply elapsed chain time by `time_scale` to get conceptual time.
- **`time_scale`:** immutable, and shown on the public page ("DEMO MODE ×43,200").
- **Payout ceiling:** a boundary test asserts the allowance never pays more than the balance.

## 8. Events (NEP-297, `ward` v1.0.0)
`trust_created, deposit, withdrawal_requested, withdrawal_vetoed, withdrawal_executed, death_attested, death_claim_cancelled, trust_activated, allowance_claimed, request_created, request_approved, request_rejected, request_executed, request_flagged, trust_paused, trust_unpaused, guardian_replaced, caregiver_changed, payee_added, child_graduation_tranche, child_deceased`

## 9. Off-chain (stretch only)
- **AI receipt check:**
  - `POST /ai/review/:requestId` calls NEAR AI Cloud. First the preflight `GET /v1/attestation/report?model&provider=near&signing_algo=ecdsa&nonce` with header `x-no-aliasing: true`.
  - Then `POST /v1/chat/completions`, then `GET /v1/signature/{chat_id}`.
  - Check `text == model:sha256(req):sha256(resp)` and that the signer equals the attested `signing_address`.
  - Finally `post_ai_review` is called, using a function-call key scoped to that method.
  - The result is advisory.
- **Funding quote:** `POST /quote` proxies to 1Click `/v0/quote` with `dry: true`. The page shows "you could fund this from USDT on Tron: X in, Y out". Nothing is tracked.

## 10. Frontend
| Route | Content |
|---|---|
| `/create` | Wizard with live checks: ≤2 per circle, ≥2 circles, shares = 100% |
| `/t/[id]` | Public ledger: status, balance, rules in plain language, guardians by circle, request timeline |
| `/t/[id]/fund` | Deposit; dry-run any-chain quote |
| `/t/[id]/guardian` | Inbox: death attestations, requests (shows which circles have approved), withdrawal veto, pause |
| `/t/[id]/caregiver` | Allowance, new request |
| `/t/[id]/child` | Flag, graduation tranches |

## 11. Threat model
| Threat | Control |
|---|---|
| Stolen settlor phone drains the trust | Free cap, delayed large withdrawals with a 2-circle veto, no withdrawals while a claim is pending |
| Stolen phone blocks activation forever | A 2nd cancel needs a guardian to vouch |
| Caregiver drains the trust | Capped allowance; large spends need another circle |
| One family side colludes | ≤2 guardians per circle; every non-trivial rule needs 2 circles |
| Caregiver holds the child's key | The child account is set by a 2-circle request; graduation is paid in tranches and can be paused |
| False death claim | 3 attestations, waiting period, settlor cancel |
| Recipient not registered with the token | Ward calls `storage_deposit` from `ops_balance` |
| Malicious DAO proposal | Council methods can't move money; Ward re-validates the circle rules |
| AI account compromised | Advisory writes only |
| `ft_transfer` failure | State updated first; callback restores it |

**Documented, not solved:**
- Coercion of a living settlor.
- Guardians who aren't crypto users (needs social login plus a gas relayer).
- Land and property.
- Token depeg or freeze.

## 12. Tests (must pass)
- `create_trust` rejects 3 guardians in one circle, and rejects child shares that don't sum to 100%.
- A withdrawal above the cap is delayed, a 2-circle veto cancels it, and no withdrawal works while a claim is pending.
- A 2nd cancel without a vouch fails.
- A large spend approved only by the caregiver's circle fails.
- `SetChildAccount` needs 2 circles, and graduation pays tranches.
- `ChildDeceased` moves the child's share to siblings.
- `council_replace_guardian` that breaks the ≤2-per-circle rule fails.
- `council_add_payee` registers storage, so the payment succeeds.
- An `ft_transfer` failure rolls back.
- The allowance boundary never overpays.

## 13. Env
The full list lives in `.env.example` (source of truth). Change both together.

---

## 14. Hard questions — decision log

### 14.1 What would break → decision
| # | Issue | Decision | Status |
|---|---|---|---|
| B1 | Someone holding the dead settlor's phone withdraws or cancels the claim | Free cap, delayed withdrawals with a 2-circle veto, no withdrawals during a claim, 2nd cancel needs a vouch | Applied |
| B2 | Child's key held by the caregiver | `SetChildAccount` needs 2 circles; graduation in tranches, pausable | Applied |
| B3 | `ft_transfer` to an unregistered account fails | `storage_deposit` from `ops_balance` whenever a payee or child is added | Applied |
| B4 | Deep cross-contract DAO spend chain runs out of gas | Removed: DAO never moves money | Applied |
| B5 | `get_proposal` JSON drift | Not needed anymore; pin the Sputnik wasm for the membership flows | Applied |
| B6 | A DAO per trust costs ~6–10 NEAR | Demo uses one DAO; `dao` stays optional per trust | Applied |
| B7 | Non-crypto guardians | Documented gap; social login plus relayer is the stated next step | Deferred |
| B8 | 2 paternal + 1 bribed guardian can capture the death quorum | Activation moves no money to anyone; every spend path still needs 2 circles | Accepted |

### 14.2 Edge cases → decision
| Edge case | Decision |
|---|---|
| A child dies before 18 | `ChildDeceased` (2 circles): the share goes to siblings, then to `fallback` |
| Several children | Fixed `share_bps`, snapshotted at activation |
| Settlor alive but incapacitated | Out of scope (documented) |
| Surviving spouse is the caregiver | Supported, shown in the demo |
| Child moves to another household | Guardian pauses; DAO `council_set_caregiver` |
| Guardian lost or hostile | DAO `council_replace_guardian`; ≥3 guardians required before activation |
| New child born | `add_child` while `Funding` |
| Request spam | `max_open_requests` |
| Token depeg or freeze | Documented |
| Real-world waiting period | Production ≥ 30 days (demo 2 min) |
| Rounding | Boundary test |

### 14.3 Cuts
| Cut | Status |
|---|---|
| DAO vote re-check / `council_spend` / `council_threshold` | Removed |
| Separate Frozen state and unfreeze flow | Replaced by `paused` flag plus `Unpause` request |
| AI receipt check | Stretch (day 10, optional) |
| 1Click | Dry-run quote display only |
| Multi-trust contract | Kept (cheap; demo needs 2 trusts) |
