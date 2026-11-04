# Ward — Architecture Essentials (v2)

> Quick reference. Full detail: `ARCHITECTURE.md` (decision log in §14). Product: `PRD.md`.
> Tasks and status: `ROADMAP.md`. **Every contribution must update it** (status, progress, Changelog). File layout: `project_structure.md`.

## What it is
- A trust for children. After the parent dies, no single relative can drain it.
- Track: Social Money.

## Non-negotiable decisions
1. **One Rust `ward` contract holds custody and enforces every spend rule.** Many trusts are keyed by `trust_id`.
2. **Guardians: 3–5 in total, ≤2 per circle, ≥2 circles.** So any 3 approvals are cross-circle by construction.
3. **Sputnik DAO handles membership changes only** (replace guardian, change caregiver, add payee). It uses a fixed weight of 3 and calls `council_*`. **The DAO never moves money.**
4. **Spend approvals happen in Ward**, by guardians calling `approve`.
5. **Defence against a stolen settlor phone:**
   - Withdrawals up to the free cap are instant.
   - Larger withdrawals are delayed and can be vetoed by guardians from 2 circles.
   - No withdrawals while a death claim is pending.
   - A 2nd cancel of a death claim needs a guardian vouch.
6. **Ward calls `storage_deposit` for every payee and child account**, paid from the settlor's NEAR `ops_balance`.
7. **`time_scale` can't change.** The token is a mock tUSDC. 1Click is a dry-run quote only. The AI check is advisory and a stretch goal.

## Lifecycle
`Funding → DeathClaimed(waiting) → Active → Graduating → Closed`
- `DeathClaimed`: reached with 3 death attestations.
- `DeathClaimed → Funding`: the settlor cancels.
- `Active`: anyone calls `finalize_activation` after the wait. Child shares are snapshotted then.
- `paused` is a flag, not a state.

## Rules
| Action | Rule |
|---|---|
| Allowance | Fixed amount per period, at most 1 period of arrears, works while paused |
| PayeePayment | 1 guardian, paid to the payee only |
| LargeSpend | 2 circles, at least one ≠ the caregiver's circle |
| SetChildAccount / ChildDeceased / Unpause / any child-flagged request | 2 circles |
| Graduation | Age 18, paid in `graduation_tranches`, pausable |
| Child flag | Age ≥ 14 |

## Core types
- `Trust{settlor,dao,caregiver,caregiver_circle,guardians,children,payees,rules,token,balance,ops_balance,status,paused,pending_withdrawal}`
- `Child{account?,birth_ts,share_bps,paid_out,tranches_paid,alive}`
- `Rules{allowance_amount,allowance_period,large_threshold,waiting_period,withdraw_free_cap,withdraw_delay,graduation_tranches,max_open_requests,fallback,time_scale}`
- `RequestKind{PayeePayment|LargeSpend|SetChildAccount|ChildDeceased|Unpause|VouchCancel}`

## Stack
- **Contract and tests:** Rust `near-sdk` 5.30, `cargo-near`; tests in `near-workspaces` with a pinned Sputnik wasm.
- **Apps:** Next.js 16 + Tailwind + wallet-selector + near-api-js; Hono API (stretch only).
- **Tooling:** pnpm monorepo, deployed on Vercel.

## Must-pass tests
- Circle validation: ≤2 per circle and ≥2 circles.
- A withdrawal is delayed or vetoed, and blocked while a death claim is pending.
- A 2nd cancel needs a vouch.
- A caregiver's circle alone can't approve a large spend.
- `SetChildAccount` needs 2 circles.
- Graduation pays tranches.
- `ChildDeceased` moves the share to siblings.
- A council change that breaks the circle rules fails.
- Payee `storage_deposit` works.
- A failed transfer rolls back.
- The allowance boundary never overpays.

## Out of scope (documented)
- Coercion of a living settlor.
- Guardians who aren't crypto users (needs social login plus a relayer).
- Land and property.
- Token depeg.

## Verify
- Sputnik factory names.
- The fixed-weight threshold policy shape.
- The mainnet USDC id.
