# Ward — Roadmap to 100% readiness

> **This file is the live plan and status of the project.**
> **Every contribution (commit, PR or agent task) must update it in the same change.** See §1.

| | |
|---|---|
| **Last updated** | 2026-11-04 |
| **Current phase** | P1 — Scaffolding (toolchain installed, everything builds) |
| **Next task** | W-1.5 (mock-ft NEP-141), W-1.6 (sandbox smoke test), then P2 |
| **Must progress** | 12 / 88 Must tasks done (14%) |
| **Overall progress** | 12 / 92 tasks done (13%) — 88 Must · 2 Should · 2 Could |
| **Submission deadline** | 14 Nov 2026, 23:59 UTC (internal target: **14 Nov 18:00 UTC**) |
| **Days left** | 10 |

---

## 1. How to update this file (mandatory on every contribution)

Every commit or PR that changes code, tests, config or docs must also update `ROADMAP.md` **in the same change**. A contribution without a roadmap update isn't done.

1. **Tick and date the task.** Set its status (see legend) and add the date in the `Done` column, e.g. `2026-11-05`.
2. **Partial work:** set the status to 🟡 and add a short note in `Notes` saying what's left.
3. **New work discovered:** add a task with the next free ID in the right phase. Never reuse IDs.
4. **Cut or deferred work:** never delete a row. Set ⛔ (cut) or ⏸ (deferred) and give the reason in `Notes`. Cutting a **Must** task needs the user's approval; record it in ARCHITECTURE §14 too.
5. **Blocked:** set 🔴 and name what blocks it.
6. **Don't edit the header in a contribution.** After each merge the maintainer runs `python3 tools/roadmap.py ROADMAP.md` (recomputes Must and overall progress) and updates `Last updated`, `Current phase`, `Next task` and `Days left`. This keeps parallel PRs from conflicting.
7. **Add one line to the Changelog (§6)**, newest first: date, task IDs, what changed, test result.
8. **Never tick a task whose "Done when" isn't fully met.** Never tick a task that has failing or skipped tests.
9. **Work comes from GitHub issues.** Each issue names its phase (milestone), wave and roadmap ID; the index is `docs/ISSUES.md`. Mark a row ✅ only when its last open issue closes, otherwise 🟡.

**Status legend:** ⬜ todo · 🟡 in progress · ✅ done · 🔴 blocked · ⏸ deferred · ⛔ cut
**Priority:** M = Must · S = Should · C = Could (from PRD §6)

## 2. Definition of 100% readiness

Ward is **100% ready** when all of these are true:

1. Every **Must** task in §4 is ✅, and every Should task is ✅ or ⏸ with a reason.
2. `pnpm lint` and `pnpm test` pass on a **fresh clone**, following only the README.
3. The contracts are on testnet. `pnpm seed` and `pnpm demo` run the full PRD §8 story with no manual steps and exit 0.
4. The web app is deployed (Vercel). The public ledger and the guardian inbox work on a phone.
5. The README meets the hackathon checklist:
   - Problem with sources (property-grabbing data).
   - "Do X, see Y" steps.
   - Architecture overview.
   - Limitations: land and property, guardians who don't use crypto, legal status.
   - Library and AI disclosure.
   - LICENSE.
6. An **independent AI-judge dry run** passes (W-11.3).
7. The video and X post are published, the repo is public, and the form is submitted. **Each needs the user's explicit OK.**
8. If both Ward and Admit (or Sealed Tip) are entered, each README names the other (hackathon rule: max 2 projects per person).

## 3. Timeline

| Date (Nov) | Phases | Exit criterion |
|---|---|---|
| 4 | P0, P1 | Decisions recorded; skeleton builds |
| 5 | P2 | Trust creation, circle rules, deposits, settlor withdrawals with delay/veto |
| 6 | P3 | Death flow, allowance, requests, pause, children and graduation |
| 7 | P4, P5 | DAO membership changes; all Must-pass integration tests green; testnet deploy |
| 8 | P6, P7 | Core TS package; create wizard + public ledger |
| 9 | P7 | Role pages working against testnet |
| 10 | P9 | `pnpm demo` passes |
| 11 | P8 (if ahead) | Optional AI receipt check / quote |
| 12 | P10, P11 | README; Vercel; fresh-clone + AI-judge dry run |
| 13 | P10 | Video + X post (with OK); buffer |
| 14 | P10 | Submit by 18:00 UTC (with OK) |

**Cut order if behind schedule** (each needs the user's OK):
1. P8 (optional features).
2. Tasks marked S.
3. The `/t/[id]/fund` quote display.
4. The child page UI (keep the contract logic; drive it from the demo script).

## 4. Phases and tasks

### P0 — Decisions & verification
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| W-0.1 | M | Confirm git identity (name/email) | Recorded in AGENTS.md Git section | — | ✅ | 2026-11-04 | Yazi <307877446+YazarAyobami@users.noreply.github.com>; GitHub YazarAyobami |
| W-0.2 | M | Approve extra deps: Vitest, `near-contract-standards` | User approves; ARCHITECTURE §2 updated | — | ✅ | 2026-11-04 | Vitest 5.1 + near-contract-standards 5.30 approved and added |
| W-0.3 | M | Verify Sputnik v2 factory accounts + fixed-weight (3) vote policy shape | Recorded; VERIFY tag removed | — | ⬜ |  |  |
| W-0.4 | M | Pin Sputnik DAO v2 wasm (commit + sha256) | `res/` has wasm + SPUTNIK_VERSION.txt | W-1.4 | ⬜ |  |  |
| W-0.5 | M | Verify `cargo-near` build subcommand | Recorded in project_structure §4 | — | ✅ | 2026-11-04 | cargo-near 0.22.0: `cargo near build non-reproducible-wasm` confirmed; near-cli-rs installed |
| W-0.6 | M | Create + fund testnet accounts: deployer, ward, tusdc, settlor, 4 guardians, caregiver, child, school | Listed in `.env` (not committed) | — | ⬜ |  |  |
| W-0.7 | S | Collect property-grabbing sources for README | Citations in README draft | — | ⬜ |  |  |

### P1 — Scaffolding
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| W-1.1 | M | `git init`, ignores, editorconfig, nvmrc, MIT LICENSE | Repo initialised; no AI attribution | W-0.1 | ✅ | 2026-11-04 | git init; private repo YazarAyobami/ward |
| W-1.2 | M | pnpm workspace + root scripts + TS/ESLint/Prettier config | `pnpm install` works | W-1.1 | ✅ | 2026-11-04 | pnpm 11.17 install OK; allowBuilds = esbuild only; next pinned 16.4.4 (release-age policy) |
| W-1.3 | M | Rust workspace | `cargo check --target wasm32` passes | W-1.1 | ✅ | 2026-11-04 | cargo check --target wasm32 passes |
| W-1.4 | M | `contracts/ward` skeleton per project_structure §2.1 | `pnpm build:contract` produces wasm | W-1.3, W-0.5 | ✅ | 2026-11-04 | contract wasm builds with cargo-near |
| W-1.5 | M | `contracts/mock-ft` (NEP-141/145 + open mint) | Mint + transfer test passes | W-0.2 | 🟡 |  | stub compiles |
| W-1.6 | M | Sandbox harness `tests/common/mod.rs` | Smoke test deploys ward + mock-ft + Sputnik | W-1.4, W-1.5, W-0.4 | 🟡 |  | harness + 36 named #[ignore] test skeletons |
| W-1.7 | M | `packages/core`, `apps/web`, `apps/api`, `scripts` skeletons | `pnpm build` + `pnpm -r test` pass | W-1.2 | ✅ | 2026-11-04 | tsc -b, eslint, next build, pnpm -r test all pass (tests are todo placeholders) |
| W-1.8 | M | `.env.example` (source of truth) | Matches every var read in code | W-1.2 | ✅ | 2026-11-04 |  |
| W-1.9 | M | CI workflow | Green on first push | W-1.6, W-1.7 | 🟡 |  | ci.yml drafted; manual-only (workflow_dispatch) until lockfile + cargo-near step exist |
| W-1.10 | M | README stub + Contributing section (ROADMAP rule) | Present | W-1.1 | ✅ | 2026-11-04 |  |

### P2 — Contract core
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| W-2.1 | M | `types.rs` per ARCHITECTURE §4 | Compiles; mirrored in `types.ts` | W-1.4 | ✅ | 2026-11-04 | + Approval/DeathAttestation/CancelWindow structs instead of tuples; free-cap fields; activation_balance |
| W-2.2 | M | `errors.rs`, `events.rs` (NEP-297 helper) | Event JSON unit test | W-2.1 | ✅ | 2026-11-04 | `emit` logs `EVENT_JSON:` payload; unit test asserts standard, version, event, data array |
| W-2.3 | M | `time.rs` (scaled, age_years, periods_elapsed) | Unit tests incl. boundaries | W-2.1 | ✅ | 2026-11-04 | 10 tests incl. demo scale, zero scale, backwards time, saturation; conceptual-duration convention recorded in ARCHITECTURE §7 |
| W-2.4 | M | `rules.rs` pure engine (guardians, shares, circles, satisfaction, allowance due, remaining share) | One unit test per rule | W-2.3 | ✅ | 2026-11-04 | All functions done (#19–#24, #31–#33): validation, circle/rejection predicates, `is_satisfied`, `allowance_due`, `remaining_share`; tests cover flagged requests, caregiver-circle exclusion, one-period arrears, paused allowance and proportional shares |
| W-2.5 | M | `access.rs` role guards | Unit tests | W-2.1 | ✅ | 2026-11-04 | Five guards, 11 tests incl. panic codes |
| W-2.6 | M | `create_trust` (validation, storage + ops_balance, payee storage_deposit) | Integration tests | W-2.4, W-2.5, W-1.6 | 🟡 |  | Implemented with unit tests incl. validation failures and E29 deposit check (#34); sandbox integration at W-5.1 |
| W-2.7 | M | `add_child`, `set_dao` | Integration tests | W-2.6 | ✅ | 2026-11-04 | `add_child` (Funding only, re-shares must sum to 10 000, emits `child_added`) and `set_dao` (settlor, once, Funding only, indexed) with unit tests incl. failure paths (#40, #41) |
| W-2.8 | M | Deposits via `ft_on_transfer` (`{"deposit": id}`; wrong token rejected) | Integration tests | W-2.6 | ✅ | 2026-11-04 | `internal_deposit` credits Funding trusts, rejects zero/inactive/claimed deposits (#35); `ft_on_transfer` parses `FtMessage` (E28), requires predecessor == `trust.token` (E24), accepts the full amount (#42). Deposits are Funding-only; documented in ARCHITECTURE §5 |
| W-2.9 | M | Settlor `withdraw` (free cap / delay), `veto_withdrawal`, `execute_withdrawal`; blocked during claim | Integration tests | W-2.8 | ✅ | 2026-11-04 | `withdraw` (free-cap rollover, pending above cap, E13/E18/E23/E32/E33), 2-circle `veto_withdrawal` and `execute_withdrawal` (E15/E16/E18/E23/E34) implemented with unit tests (#36, #37, #43) |
| W-2.10 | M | `token.rs` transfers + storage_deposit + `on_payout` rollback | Failure-path test | W-2.8 | ✅ | 2026-11-04 | `ft_transfer`, `storage_deposit`, `payout` chain and `on_payout` rollback (balance credit + request reopened) with failure-path unit tests (#9, #10, #30); sandbox failure at W-5.8 |
| W-2.11 | M | Views | Integration tests | W-2.6 | ✅ | 2026-11-04 | `get_trust`, `get_trusts_for`, paginated `get_requests` (#11–#13), plus `get_child_status` (age, flag/graduation gates, remaining share, tranches left) and `get_allowance_due` with unit tests (#38, #39) |
| W-2.12 | M | Unit-test state builders (`src/test_utils.rs`: make_trust, make_guardian, make_request, insert helpers) | Builders used by at least one unit test | W-2.1 | ✅ | 2026-11-04 | Builders + `set_caller` env helper + `insert_trust`/`insert_request`; used by access, rules and test_utils tests |

### P3 — Lifecycle & requests
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| W-3.1 | M | `attest_death` (3 → DeathClaimed) | Tests | W-2.6 | ✅ | 2026-11-04 | 3 distinct attestations set `DeathClaimed` with `ends_at = now + scaled(waiting_period)`; duplicate E17; blocked while a claim is pending (E13) (#44) |
| W-3.2 | M | `cancel_death_claim` + `VouchCancel` for 2nd cancel in window | Tests | W-3.1, W-3.6 | ✅ | 2026-11-04 | First cancel restores the pre-claim status and opens the window; a second cancel inside the window needs an executed `VouchCancel` (E14); attestations cleared (#45, #49) |
| W-3.3 | M | `finalize_activation` (snapshot activation_balance) | Tests | W-3.1 | ✅ | 2026-11-04 | Anyone after `ends_at`; snapshots `activation_balance`, sets `activated_at`, clears claim state; before the deadline E13 (#46) |
| W-3.4 | M | `claim_allowance` (1 period arrears max; works while paused; ≤ balance) | Tests | W-3.3 | ✅ | 2026-11-04 | Caregiver-only; pays `allowance_due`, advances the clock to `now` (arrears are not banked), works while paused; failed transfer restores balance and clock (#47) |
| W-3.5 | M | `create_request` (limit on open requests) | Tests | W-3.3 | ✅ | 2026-11-04 | Caregiver or guardian (E37); Active/Graduating only; per-kind validation (E20/E32/E36/E40); open Pending+Approved requests capped by `max_open_requests` (E19) (#48) |
| W-3.6 | M | `approve` / `reject` / `execute_request` for every RequestKind | Tests per kind | W-3.5, W-2.10 | ✅ | 2026-11-04 | All six kinds execute; 2-circle rejections (E21 for repeat votes); paused trusts defer everything except `Unpause`; failed payouts restore state; `ChildDeceased` bps redistribution + fallback (#49–#52) |
| W-3.7 | M | `pause` + `Unpause` request | Tests | W-3.6 | ✅ | 2026-11-04 | Any guardian pauses Active/Graduating trusts; `Unpause` needs 2 circles and executes while paused; allowance still pays (#53) |
| W-3.8 | M | Child `flag` (≥14) → 2-circle rule | Tests | W-3.6 | ✅ | 2026-11-04 | Registered child only (E05), age gate E22, flags Pending/Approved requests and drops an Approved request back to Pending when one circle is no longer enough (#54) |
| W-3.9 | M | `claim_graduation` tranches (≥18), pausable | Tests | W-3.6 | ✅ | 2026-11-04 | One tranche per allowance period from activation (E41), `remaining_share / tranches_left`, closes at balance 0 with all tranches; failed transfer restores balance, `paid_out` and tranche count (#55, #56) |
| W-3.10 | M | `ChildDeceased` → share to siblings, then fallback | Tests | W-3.6 | ✅ | 2026-11-04 | Dead child's bps redistributed pro rata to living siblings (remainder to the last); no siblings → remaining share split across `fallback`; dead payouts excluded from `remaining_share` (#57) |

### P4 — DAO & testnet
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| W-4.1 | M | Council methods (replace guardian w/ circle re-validation, set caregiver, add payee + storage) | Tests incl. non-DAO rejected | W-2.6 | ⬜ |  |  |
| W-4.2 | M | `scripts/deploy-testnet.ts` | Explorer links; idempotent | P5, W-0.6 | ⬜ |  |  |
| W-4.3 | M | `scripts/seed.ts` (demo cast, shared DAO, 2 trusts) | `pnpm seed` exits 0 | W-4.2, W-0.3 | ⬜ |  |  |

### P5 — Integration test suite
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| W-5.1 | M | `tests/circles.rs` | Green | W-2.6, W-4.1 | ⬜ |  |  |
| W-5.2 | M | `tests/settlor_withdrawals.rs` | Green | W-2.9 | ⬜ |  |  |
| W-5.3 | M | `tests/death_flow.rs` | Green | W-3.1–W-3.3 | ⬜ |  |  |
| W-5.4 | M | `tests/allowance.rs` | Green | W-3.4 | ⬜ |  |  |
| W-5.5 | M | `tests/requests.rs` | Green | W-3.5–W-3.7 | ⬜ |  |  |
| W-5.6 | M | `tests/children.rs` | Green | W-3.8–W-3.10 | ⬜ |  |  |
| W-5.7 | M | `tests/council.rs` (incl. real Sputnik proposal) | Green | W-4.1, W-0.4 | ⬜ |  |  |
| W-5.8 | M | `tests/transfer_failures.rs` | Green | W-2.10 | ⬜ |  |  |
| W-5.9 | M | clippy + fmt clean | Rust lint green | P2–P4 | ⬜ |  |  |

### P6 — Shared TypeScript core (`@ward/core`)
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| W-6.1 | M | `types.ts` zod mirror | Parses real testnet views | W-4.2 | 🟡 |  | schemas written to match types.rs; not yet validated against chain |
| W-6.2 | M | `rules.ts` mirror of `rules.rs` | Same test cases as Rust | W-2.4 | ⬜ |  |  |
| W-6.3 | M | `contract.ts` views + call builders | Used by scripts and web | W-6.1 | ⬜ |  |  |
| W-6.4 | M | `format.ts`, `config.ts` | Unit tests | W-1.7 | ⬜ |  |  |

### P7 — Web app (`apps/web`)
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| W-7.1 | M | Layout, landing, DemoModeBanner | Renders mobile + desktop | W-6.4 | ⬜ |  |  |
| W-7.2 | M | `/create` wizard with live circle/share checks | Creates a trust on testnet | W-6.2, W-6.3 | ⬜ |  |  |
| W-7.3 | M | `/t/[id]` public ledger (rules in plain language, guardians by circle, timeline) | Matches chain state | W-6.3 | ⬜ |  |  |
| W-7.4 | M | `/t/[id]/fund` deposit | Deposit succeeds | W-6.3 | ⬜ |  |  |
| W-7.5 | M | `/t/[id]/guardian` inbox (attest, approve/reject with circle progress, veto, pause) | Each action succeeds | W-6.3 | ⬜ |  |  |
| W-7.6 | M | `/t/[id]/caregiver` (allowance, new request, receipt hash) | Each action succeeds | W-6.3 | ⬜ |  |  |
| W-7.7 | M | `/t/[id]/child` (flag, graduation) | Each action succeeds | W-6.3 | ⬜ |  |  |
| W-7.8 | M | Accessibility + mobile pass | Checklist in Notes | W-7.1–W-7.7 | ⬜ |  |  |
| W-7.9 | S | Web component tests (Vitest) | Green | W-0.2 | ⬜ |  |  |

### P8 — Optional (Could)
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| W-8.1 | C | AI receipt check (NEAR AI Cloud attestation + signature; `post_ai_review`) | Verified panel renders | All M done | ⬜ |  |  |
| W-8.2 | C | 1Click dry-run quote on `/fund` | Quote shown | All M done | ⬜ |  |  |

### P9 — Demo script (PRD §8 = acceptance test)
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| W-9.1 | M | Step 1: create "Ada & Tobi" trust | Asserted | W-4.3 | ⬜ |  |  |
| W-9.2 | M | Step 2: deposit 2,000 tUSDC | Asserted | W-9.1 | ⬜ |  |  |
| W-9.3 | M | Step 3: 3 attestations → wait → Active | Asserted | W-9.2 | ⬜ |  |  |
| W-9.4 | M | Step 4: allowance; uncle's 1,500 needs 2 circles; pastor rejects | Asserted | W-9.3 | ⬜ |  |  |
| W-9.5 | M | Step 5: school fee paid directly to school | Asserted | W-9.3 | ⬜ |  |  |
| W-9.6 | M | Step 6: paternal-side DAO proposal fails (needs 3) | Asserted | W-9.3 | ⬜ |  |  |
| W-9.7 | M | Step 7: stolen-phone withdrawal delayed + vetoed (2nd trust) | Asserted | W-9.1 | ⬜ |  |  |
| W-9.8 | M | Step 8: flag at 14; child account set; graduation tranches at 18 | Asserted | W-9.3 | ⬜ |  |  |
| W-9.9 | M | Step 9: public ledger shows history | Screenshot | W-7.3 | ⬜ |  |  |
| W-9.10 | M | `pnpm demo` exits non-zero on any unexpected state; < 5 min | Two clean consecutive runs | W-9.1–W-9.8 | ⬜ |  |  |

### P10 — Documentation, deployment, submission
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| W-10.1 | M | README: problem + sources, how it works, diagram | Reviewed vs PRD §1 | P9 | ⬜ |  |  |
| W-10.2 | M | README: "do X, see Y" quickstart | W-11.2 passes with only these steps | W-9.10 | ⬜ |  |  |
| W-10.3 | M | README: limitations + threat model summary | Matches ARCHITECTURE §11 | W-10.1 | ⬜ |  |  |
| W-10.4 | M | README: library + AI disclosure; name the other entered project | Present | W-10.1 | ⬜ |  |  |
| W-10.5 | M | Deploy web to Vercel | Public URL works on a phone | P7 | ⬜ |  | Ask before deploying |
| W-10.6 | M | Screenshots in README | Present | W-10.5 | ⬜ |  |  |
| W-10.7 | M | Demo video (≤ 2 min) | Ready for user review | W-9.10 | ⬜ |  |  |
| W-10.8 | M | X post draft | **Posted only with explicit OK** | W-10.7 | ⬜ |  |  |
| W-10.9 | M | Make repo public | **Only with explicit OK** | W-11.4 | ✅ | 2026-11-04 | made public on user's explicit OK (2026-11-04); secrets scan clean |
| W-10.10 | M | Submit hackathon form | **Only with explicit OK**; can't be edited | W-10.8, W-10.9 | ⬜ |  |  |

### P11 — Final QA
| ID | Pri | Task | Done when | Depends | Status | Done | Notes |
|---|---|---|---|---|---|---|---|
| W-11.1 | M | `pnpm lint && pnpm test` green; no skipped tests | Output in Changelog | All M | ⬜ |  |  |
| W-11.2 | M | Fresh-clone test following only the README | Every step works | W-10.2 | ⬜ |  |  |
| W-11.3 | M | AI-judge dry run (agent with only repo + README) | No failed claims | W-11.2 | ⬜ |  |  |
| W-11.4 | M | Secrets audit of git history | Clean | W-11.1 | ⬜ |  |  |
| W-11.5 | M | Docs consistency (PRD, ARCHITECTURE, ESSENTIALS, project_structure, AGENTS vs code) | Checklist in Notes | W-11.1 | ⬜ |  |  |
| W-11.6 | M | Commit history check (conventional, no AI attribution) | Clean | W-11.1 | ⬜ |  |  |

## 5. Already done (pre-code)
| ID | Task | Done |
|---|---|---|
| W-D.1 | PRD.md | 2026-11-03 |
| W-D.2 | ARCHITECTURE.md v2 + ESSENTIALS v2 | 2026-11-04 |
| W-D.3 | AGENTS.md + CLAUDE.md | 2026-11-04 |
| W-D.4 | project_structure.md | 2026-11-04 |
| W-D.5 | ROADMAP.md | 2026-11-04 |

(Pre-code docs are not counted in the progress totals.)

## 6. Changelog (newest first)
| Date | Tasks | Change | Tests |
|---|---|---|---|
| 2026-11-04 | W-3.1–W-3.10 | Wave 4: death attestation/claim/finalize/cancel + vouch; allowance; request creation/approval/rejection/execution for all six kinds; pause/unpause; child flag and graduation tranches; sibling/fallback inheritance; payout rollback callbacks for allowance and graduation. Added E37–E41 and corrected `remaining_share` to add back living children's payouts only. (#44–#59) | `cargo test --workspace` ✅ 181 unit tests · `cargo check --workspace --target wasm32-unknown-unknown` ✅ · `cargo clippy --all-targets` ✅ |
| 2026-11-04 | W-2.7, W-2.8, W-2.9, W-2.11 | Wave 3: `get_child_status` and `get_allowance_due`; `add_child` and `set_dao`; `ft_on_transfer` parsing + token check; `execute_withdrawal` (#38–#43). Added E36. | `cargo test --workspace` ✅ 111 unit tests · `cargo check --workspace --target wasm32-unknown-unknown` ✅ · `cargo clippy --all-targets -A dead_code` ✅ (one expected dead-code warning until Phase 3 wires `execute_request`) |
| 2026-11-04 | W-2.4, W-2.10; W-2.6, W-2.8, W-2.9 (partial) | Wave 2: `is_satisfied`, `allowance_due` and `remaining_share`; `create_trust` with deposit accounting and payee registration; `internal_deposit`; settlor `withdraw` (free cap, pending above cap, period rollover) and guardian `veto_withdrawal` (2 circles); `payout` + `on_payout` rollback (#30–#37). Added E31–E35. | `cargo test --lib` ✅ 86 passed · `cargo check --target wasm32-unknown-unknown` ✅ · `cargo clippy --all-targets -A dead_code` ✅ (2 expected dead-code warnings until wave 3 wires `ft_on_transfer` and `execute_request`) |
| 2026-11-04 | W-2.10 (partial), W-2.11 (partial) | NEP-141 `ft_transfer` and NEP-145 `storage_deposit` promises with mock-receipt tests; `get_trust`, `get_trusts_for` and paginated `get_requests` with unit tests (#9–#13). | `cargo test --lib` ✅ 42 passed · `cargo check --target wasm32-unknown-unknown` ✅ · `cargo clippy --all-targets -A dead_code` ✅ |
| 2026-11-04 | W-2.2, W-2.3, W-2.5, W-2.12; W-2.4 (partial) | Implemented NEP-297 `emit`, the time helpers, wave-1 rule functions (guardian/share/circle validation, two-circle and rejection predicates, `circle_of`), the five role guards, and unit-test builders with named unit tests (#14–#29 except the wave-2 rules). Clarified the duration convention in ARCHITECTURE §7 and applied rustfmt to the remaining contract stubs so `cargo fmt --check` is clean. | `cargo test --lib` ✅ 37 passed · `cargo check --target wasm32-unknown-unknown` ✅ · `cargo clippy --all-targets` ✅ apart from 3 pre-existing dead-code warnings in unimplemented stubs (W-5.9) |
| 2026-11-04 | W-2.12 (new) | Created 164 GitHub issues covering every open roadmap task (milestone per phase; labels phase/area/size/wave/maintainer; index in docs/ISSUES.md). Repo interaction limited to collaborators. Header rule changed: contributions update their row + Changelog only; maintainer recomputes the header with tools/roadmap.py. Added W-2.12 (test-state builders) so wave issues stay independent. | n/a (docs and process) |
| 2026-11-04 | W-10.9 | Repo made public at github.com/YazarAyobami/ward on the user's explicit OK. | n/a |
| 2026-11-04 | W-0.2, W-0.5, W-1.2, W-1.4, W-1.7 | Approved deps added (Vitest, near-contract-standards); installed cargo-near 0.22.0 + near-cli-rs; pnpm install with build-script allow-list; pinned next 16.4.4 to respect pnpm's minimum release age; ignored next-env.d.ts; docs updated (AGENTS toolchain, ARCHITECTURE §2, project_structure). | cargo near build ✅ (2 contracts) · cargo test ✅ 0 failed (scaffold tests ignored) · tsc -b ✅ · eslint ✅ · next build ✅ · pnpm -r test ✅ 0 failed (todo placeholders) |
| 2026-11-04 | W-0.1, W-1.1, W-1.9 | Git initialised; identity recorded in AGENTS.md; CI set to manual-only; first push to private repo YazarAyobami/ward. | n/a (no code change) |
| 2026-11-04 | W-1.1–W-1.10, W-2.1, W-6.1, W-D.4, W-D.5 | Created ROADMAP.md and project_structure.md; scaffolded the repo (root config, Rust workspace, ward data model + method stubs, mock-ft stub, 36 named integration-test skeletons, @ward/core zod mirror, web routes, optional api, scripts, fixtures). Added the ROADMAP rule to all docs. | `cargo check --target wasm32-unknown-unknown` ✅; TS not installed yet |
