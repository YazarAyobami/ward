# Ward — Project Structure

> This is where every file lives and what it's responsible for. Read it before creating a file.
> If you add, move or rename a file, update this document in the same change.
> Every contribution must also update `ROADMAP.md` (your task row + Changelog line). See `ROADMAP.md` §1.

---

## 1. Top-level tree

```
ward/
├── AGENTS.md  CLAUDE.md          # agent rules (read first)
├── PRD.md                        # scope; demo script (§8) = acceptance test
├── ARCHITECTURE.md               # full design, §14 decision log
├── ARCHITECTURE_ESSENTIALS.md    # short reference for agents
├── project_structure.md          # this file
├── ROADMAP.md                    # live task list + status — UPDATE IN EVERY CONTRIBUTION
├── tools/roadmap.py              # updates ROADMAP rows; recomputes the header after merges
├── docs/ISSUES.md                # index of GitHub issues by phase, wave and roadmap ID
├── README.md  LICENSE
├── package.json  pnpm-workspace.yaml  tsconfig.base.json  tsconfig.json
├── eslint.config.mjs  .prettierrc  .editorconfig  .nvmrc  .gitignore
├── .env.example                  # source of truth for env vars
├── Cargo.toml  rust-toolchain.toml  rustfmt.toml
├── .github/workflows/ci.yml
├── contracts/
│   ├── ward/                     # the product contract
│   └── mock-ft/                  # testnet tUSDC
├── packages/core/                # @ward/core — TS types (zod), rules mirror, contract client
├── apps/
│   ├── web/                      # Next.js UI (core product)
│   └── api/                      # OPTIONAL (Could): AI receipt check + 1Click quote
├── scripts/                      # deploy, seed, demo
├── fixtures/                     # fictional demo cast + receipts
└── docs/screenshots/
```

## 2. Contracts

### 2.1 `contracts/ward/`
```
ward/src/
├── lib.rs        # Contract state (trusts, requests, by_account), init, ft_on_transfer {"deposit": id}
├── types.rs      # Circle, TrustStatus, Guardian, Child, Payee, Rules, Approval, DeathAttestation,
│                 # PendingWithdrawal, CancelWindow, Trust, RequestKind, RequestStatus, Request, AiReview,
│                 # ChildInput, FtMessage, ChildStatus
├── errors.rs     # E01…E30 coded errors
├── events.rs     # NEP-297 `ward` events (ARCHITECTURE §8)
├── time.rs       # time_scale helpers, age_years, periods_elapsed — the ONLY time maths
├── rules.rs      # PURE rule engine: guardian/circle validation, shares, approval satisfaction,
│                 # allowance due, remaining share (mirrored in packages/core/src/rules.ts)
├── access.rs     # assert_settlor / assert_guardian / assert_caregiver / assert_child / assert_dao
├── trust.rs      # create_trust, add_child, set_dao, finalize_activation
├── settlor.rs    # deposits, withdraw (free cap / delay), execute_withdrawal, cancel_death_claim
├── guardian.rs   # attest_death, approve, reject, veto_withdrawal, pause
├── caregiver.rs  # claim_allowance, create_request
├── child.rs      # flag, claim_graduation
├── requests.rs   # execute_request (internal) for every RequestKind
├── council.rs    # DAO-only: council_replace_guardian, council_set_caregiver, council_add_payee
├── token.rs      # ft_transfer / storage_deposit + on_payout callback; post_ai_review (Could)
└── views.rs      # get_trust, get_trusts_for, get_requests, get_child_status, get_allowance_due
ward/tests/
├── common/mod.rs           # sandbox harness
├── circles.rs              # W-5.1
├── settlor_withdrawals.rs  # W-5.2
├── death_flow.rs           # W-5.3
├── allowance.rs            # W-5.4
├── requests.rs             # W-5.5
├── children.rs             # W-5.6
├── council.rs              # W-5.7
└── transfer_failures.rs    # W-5.8
ward/res/                   # pinned sputnikdao2.wasm + SPUTNIK_VERSION.txt
```
**Rules**
- **`rules.rs` is pure** (no `env::`). Unit tests live in the same file, and `rules.ts` mirrors it.
- **The DAO never moves money.** `council.rs` must not transfer tokens or NEAR, except the `storage_deposit` in `council_add_payee`.
- **Test names** state the rule they check.

### 2.2 `contracts/mock-ft/`
Same as Admit's mock token: NEP-141/145 plus an open `mint`. Testnet and sandbox only. It still needs `near-contract-standards` approval.

## 3. TypeScript workspace

| Path | Responsibility |
|---|---|
| `packages/core/src/types.ts` | zod mirror of `types.rs` |
| `packages/core/src/rules.ts` | mirror of `rules.rs` (UI previews, e.g., live circle checks in `/create`) |
| `packages/core/src/contract.ts` | the only place that knows method names and argument shapes |
| `packages/core/src/format.ts`, `config.ts` | amounts (bigint), explorer URLs |
| `apps/web/app/page.tsx` | landing |
| `apps/web/app/create/page.tsx` | create-trust wizard |
| `apps/web/app/t/[id]/page.tsx` | public ledger |
| `apps/web/app/t/[id]/{fund,guardian,caregiver,child}/page.tsx` | role pages |
| `apps/web/components/*` | CircleBadge, GuardianPicker, RulesSummary, RequestCard, ApprovalProgress, Timeline, DemoModeBanner |
| `apps/web/lib/wallet.ts` | wallet-selector setup |
| `apps/api/src/routes/{receipts,ai,quote}.ts` | **Could only**: receipt storage, AI check, dry-run quote |
| `scripts/{deploy-testnet,seed,demo}.ts`, `scripts/lib/*` | testnet automation; `demo.ts` = PRD §8 |

Tests in `packages/*` and `apps/api` use `node:test` via `tsx`. Web tests use Vitest.

## 4. Root scripts
| Script | Runs |
|---|---|
| `build` / `build:contract` | `cargo near build non-reproducible-wasm` per contract (verified with cargo-near 0.22.0), then TS builds |
| `check:contract` | `cargo check --workspace --target wasm32-unknown-unknown` |
| `test` / `test:contract` | contract build + `cargo test --workspace`, then `pnpm -r test` |
| `lint` | `cargo fmt --check`, `clippy -D warnings`, ESLint, `tsc -b` |
| `dev` | web + api |
| `deploy:testnet`, `seed`, `demo` | `scripts/*.ts` via tsx |

## 5. Dependency direction
`contracts/*` (no TS deps) · `packages/core` ← `apps/web`, `apps/api`, `scripts`. The apps never import each other.

## 6. Where new code goes
| You're adding… | Put it in… | Also update |
|---|---|---|
| **Anything at all** | — | **`ROADMAP.md`**: your task row + Changelog line |
| A contract method | its role module (`settlor.rs`, `guardian.rs`, …) | `tests/<area>.rs`, `contract.ts`, ARCHITECTURE §5 |
| A type or field | `types.rs` | `types.ts`, ARCHITECTURE §4 |
| An approval rule | `rules.rs` **and** `rules.ts` | ARCHITECTURE §6, ESSENTIALS "Rules" |
| An event / error | `events.rs` / `errors.rs` | ARCHITECTURE §8 |
| A UI page | `apps/web/app/...` | ARCHITECTURE §10 |
| An env var | where it's read | `.env.example` |
| A demo step | `scripts/demo.ts` | PRD §8, README |

## 7. Naming
- **Rust:** `snake_case` / `PascalCase`; errors `E##_NAME`.
- **TypeScript:** `kebab-case.ts`, `PascalCase.tsx`.
- **Testnet accounts:** `ward.<you>.testnet`, `tusdc.<you>.testnet`, `school.<you>.testnet`.
