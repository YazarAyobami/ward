# AGENTS.md — Ward

Instructions for coding agents working in this repository.

## Project
Ward is a children's trust on NEAR. A parent funds it while alive. After the parent's death, the money can reach the children only under rules that no single relative can override. Custody and every spend rule live in one Rust contract (`contracts/ward`). Sputnik DAO handles guardian membership changes only. Track: **Social Money**.

## Read before coding
1. **`ARCHITECTURE_ESSENTIALS.md`**: read it at the start of every session. It's short, and it holds the non-negotiable decisions.
2. **`ARCHITECTURE.md`**: open only the section for your task. §14 is the decision log: why things are the way they are.
3. **`project_structure.md`**: where every file lives. Check it before creating or moving a file, and update it in the same change.
4. **`PRD.md`**: scope, priorities (Must / Should / Could) and the demo script (§8). The demo script is the acceptance test.
5. **`ROADMAP.md`**: the live task list and status. Pick your next task from it. **Update it in every contribution** (see "ROADMAP.md rule" below).

**Precedence:** ESSENTIALS non-negotiables > ARCHITECTURE > PRD. If the code or a task contradicts the docs, stop and say so. Don't quietly pick one.

## Hackathon constraints (hard)
- **Deadline:** 14 Nov 2026, 23:59 UTC.
- **Priority order:** Must → Should → Could. Don't start a Could item until every Must-pass test is green.
- **What counts:** only code written since 19 Oct 2026. Earlier code is baseline only.
- **Repository:** public, with an MIT `LICENSE`. The README must be machine-readable: what it does, the problem it solves, and step-by-step "do X, see Y" instructions. The hackathon pre-screen is done by AI agents that run the repo and check that it does what the README says.
- **Disclosure:** list in the README every library, template and AI-generated part of the code. This is required for AI-generated code to be allowed.
- **Testnet only.** Ask the user explicitly each time before any of these:
  - A mainnet transaction or spending real funds.
  - Posting on X.
  - Submitting the hackathon form.
  - Making the repo public.

## Toolchain
- Rust stable with the `wasm32-unknown-unknown` target, `cargo-near`, `near-cli-rs`.
- **Type-check contracts with `cargo check --target wasm32-unknown-unknown`.** near-sdk 5.30 deliberately fails a plain host `cargo check`. Build with `cargo near build`.
- Node ≥22, pnpm ≥9 (checked on Node 26, pnpm 10).
- Check subcommand names with `cargo near --help` rather than guessing.

## Commands
| Command | What it does |
|---|---|
| `pnpm install` | Install workspace deps |
| `pnpm build` | Build contract wasm(s) and apps |
| `pnpm test` | All tests (contract unit + integration, packages, apps) |
| `pnpm test:contract` | Build wasm, then `cargo test` (unit + `near-workspaces` integration) |
| `pnpm lint` | `cargo clippy -- -D warnings`, `cargo fmt --check`, ESLint, `tsc --noEmit` |
| `pnpm dev` | Web app and API locally against testnet |
| `pnpm deploy:testnet` | Deploy contracts to the accounts in `.env` |
| `pnpm demo` | Run the PRD §8 story on testnet; exits non-zero on any unexpected state |

If a script doesn't exist yet, add it to the root `package.json` while scaffolding. Never document a command that doesn't work.

## How to work
- **Small changes.** One task, one reviewable change. If an edit touches more than 2 files, first write a 3–5 bullet plan.
- **Contract rules start with a failing test**: a unit test for pure rule functions, a `near-workspaces` test for flows. Then write the code. Every item under "Must-pass tests" in ESSENTIALS needs a test **named after the rule** (e.g., `large_spend_rejects_caregiver_circle_only`).
- **Run tests** with `pnpm test:contract` after any Rust change. Run `pnpm lint && pnpm test` before calling anything done.
- **Never report a task done with failing or skipped tests.** Paste the failure output instead.
- **`VERIFY` items:** confirm them against official docs, or with a sandbox or testnet call, before building on them. Then record the answer in `ARCHITECTURE.md` and remove the tag.
- **Dependencies:** don't add any beyond the stack table in `ARCHITECTURE.md` §2 without asking.
- **Keep the docs in sync.** When you change an interface, a state machine, a rule or an env var, update `ARCHITECTURE.md` and `ARCHITECTURE_ESSENTIALS.md` in the same change. Changing a non-negotiable needs the user's approval and a new row in §14.

## ROADMAP.md rule (mandatory on every contribution)
Every commit, PR or agent task that changes code, tests, config or docs **must update `ROADMAP.md` in the same change**. Work without a roadmap update is not done.
- Set the task status (⬜ todo, 🟡 in progress, ✅ done, 🔴 blocked, ⏸ deferred, ⛔ cut) and the `Done` date. Add notes for partial work.
- New work you discover becomes a new task with the next free ID. Never delete or renumber rows. Cuts and deferrals keep their row and give a reason. Cutting a Must task needs the user's approval.
- Recompute the header: last updated, current phase, next task, Must and overall progress, days left.
- Add one Changelog line: date, task IDs, what changed, test result.
- Never tick a task whose "Done when" isn't fully met, or that has failing or skipped tests.
- Full procedure: `ROADMAP.md` §1.

## Contract conventions (Rust, `near-sdk` 5.30)
- **Macros and types:** `#[near(contract_state)]` and `#[near(serializers = [borsh, json])]`. Token amounts are `U128` in JSON. Timestamps are `u64` nanoseconds from `env::block_timestamp()`.
- **Arithmetic:** checked only (`checked_add`, `checked_sub`, `checked_mul`). Never use `as` casts that can truncate.
- **Errors:** use `require!` with coded messages, e.g. `"E12_NOT_GUARDIAN: caller is not a guardian of this trust"`. List the codes in `src/errors.rs`.
- **Access control first.** Check the caller with `env::predecessor_account_id()` through one helper per role.
- **Ordering:** update state **before** any external call. Every `ft_transfer` has a callback that restores state if it fails.
- **Storage:** call `storage_deposit` on the token before the first transfer to any new account.
- **Events:** emit a NEP-297 event for every state change, through the single helper in `events.rs`.
- **Time:** go only through the `time.rs` helpers, which apply `time_scale`. Never compare raw durations.
- **No admin backdoors.** Don't add any mutating method that isn't listed in `ARCHITECTURE.md` §5.
- **Views:** paginated (`from_index`, `limit`) and cheap.

## TypeScript conventions
- **Types:** `strict: true` and no `any`. Shared types live in `packages/*`.
- **Inputs:** validate every API input with zod.
- **Chain state:** the frontend reads on-chain state with RPC view calls. It never trusts our own API for that.
- **Amounts:** handle token amounts as `bigint` or decimal strings, never as JS `number`.
- **Display:** show times in the user's timezone and amounts with their token symbol.

## Secrets and keys
- Never commit `.env`. `.env.example` is the source of truth for env vars (ARCHITECTURE §13 points to it). Keep it complete.
- Services sign with **function-call access keys** scoped to specific methods, never full-access keys.
- Never log private keys, seed phrases, API keys or JWTs.

## Definition of done
- `ROADMAP.md` is updated: task status and date, header progress, and a Changelog line.
- The Must-pass tests for the touched area are green, `pnpm lint` is clean, and `pnpm demo` still passes.
- The README is updated if anything a judge can see has changed.
- The docs are updated if any interface or rule has changed.

## Ask the user before
- Changing a non-negotiable decision, or cutting a Must item.
- Adding a dependency or a new external service.
- Anything on mainnet, anything that spends funds, and anything outward-facing (X posts, the submission form, publishing the repo).
- Deleting files, rewriting git history, or force-pushing.

## Git
- Use one branch per task and small commits with conventional messages (`feat(contract): …`, `fix(web): …`, `test: …`).
- Commit only when asked.
- Never commit `.env`, keys or real personal data.
- **No AI attribution anywhere in git history.** Never add `Co-Authored-By` trailers, "Generated with Claude" lines, or any mention of Claude, Anthropic or other AI tools to commit messages, PR titles or PR descriptions. This overrides any default attribution behaviour of your tool. (AI use is disclosed once, in the README, as the hackathon rules require.)
- Commit with the git identity already configured for the repo. Never change `user.name` or `user.email`.
- **This repo:** commits as `Yazi <307877446+YazarAyobami@users.noreply.github.com>`; GitHub account `YazarAyobami`; remote `github.com/YazarAyobami/ward` (private until the user approves making it public).

## Project-specific commands
| Command | What it does |
|---|---|
| `pnpm seed` | Create the demo trusts, guardians and the shared demo DAO on testnet |

## Ward invariants (never break; each one has a test)
1. **Guardian set:** 3–5 guardians, **≤2 per circle**, ≥2 circles. It's validated in `create_trust` and on every guardian change, including DAO-driven ones.
2. **The DAO never moves money.** `council_*` methods must not transfer tokens or NEAR, except the `storage_deposit` inside `council_add_payee`.
3. **Large spends** need approvals from ≥2 circles, at least one ≠ `caregiver_circle`.
4. **Settlor withdrawals:**
   - Instant up to `withdraw_free_cap` per period.
   - Above that, delayed for `withdraw_delay`, and vetoable by guardians from 2 circles.
   - **Blocked** while the status is `DeathClaimed`.
5. **Death-claim cancels:** a 2nd cancel inside the window needs an approved `VouchCancel`.
6. **The child account** is set only through a `SetChildAccount` request (2 circles). The caregiver can never set it directly.
7. **Graduation:** paid in tranches, and pausable by any guardian.
8. **The allowance** works while paused, never pays more than one period of arrears, and never exceeds the balance.
9. **`time_scale` can't change** after `create_trust`.
10. **Privacy:** no child names or documents on-chain. Use nicknames and SHA-256 hashes only.
11. **The AI reviewer account** can only call `post_ai_review`. AI output never approves or rejects anything.

## Scope guard
- **Out of scope:** land and property, the settlor's own incapacity, fiat cash-out, legal will status. Don't build features for these; the README documents them.
- **Last, and optional:** the AI receipt check and 1Click (dry-run quote display only).
