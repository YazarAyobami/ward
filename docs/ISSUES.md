# Issues index

All work to complete `ROADMAP.md`, as GitHub issues in [YazarAyobami/ward](https://github.com/YazarAyobami/ward/issues).
Each phase is a milestone. Within a wave, no issue blocks another; a later wave starts after the earlier wave of that phase is merged.
`maintainer` issues need keys, funds or decisions. Contributions are from collaborators only.

## P0 — Decisions & verification (4 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#1](https://github.com/YazarAyobami/ward/issues/1) | 1 | W-0.3 | S | Verify Sputnik DAO v2 factory accounts and fixed-weight (3) vote policy JSON |
| [#2](https://github.com/YazarAyobami/ward/issues/2) | 1 | W-0.4 | S | Pin the Sputnik DAO v2 wasm used in tests |
| [#3](https://github.com/YazarAyobami/ward/issues/3) | 1 | W-0.6 | S | Create and fund the testnet accounts · **maintainer** |
| [#4](https://github.com/YazarAyobami/ward/issues/4) | 1 | W-0.7 | S | Collect property-grabbing sources for the README |

## P1 — Scaffolding (4 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#5](https://github.com/YazarAyobami/ward/issues/5) | 1 | W-1.5 | S | mock-ft: implement NEP-141 + NEP-145 with open mint |
| [#6](https://github.com/YazarAyobami/ward/issues/6) | 1 | W-1.6 | S | sandbox harness: deploy ward and call `new` |
| [#7](https://github.com/YazarAyobami/ward/issues/7) | 1 | W-1.9 | S | CI: install cargo-near and run on every push |
| [#8](https://github.com/YazarAyobami/ward/issues/8) | 2 | W-1.6 | S | sandbox harness: add mock-ft and role accounts to `setup()` |

## P2 — Contract core (35 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#9](https://github.com/YazarAyobami/ward/issues/9) | 1 | W-2.10 | XS | token: implement `ft_transfer` |
| [#10](https://github.com/YazarAyobami/ward/issues/10) | 1 | W-2.10 | XS | token: implement `storage_deposit` |
| [#11](https://github.com/YazarAyobami/ward/issues/11) | 1 | W-2.11 | XS | views: implement `get_trust` |
| [#12](https://github.com/YazarAyobami/ward/issues/12) | 1 | W-2.11 | XS | views: implement `get_trusts_for` |
| [#13](https://github.com/YazarAyobami/ward/issues/13) | 1 | W-2.11 | XS | views: implement `get_requests` |
| [#14](https://github.com/YazarAyobami/ward/issues/14) | 1 | W-2.12 | S | test utils: unit-test state builders |
| [#15](https://github.com/YazarAyobami/ward/issues/15) | 1 | W-2.2 | XS | events: implement `emit` (NEP-297) |
| [#16](https://github.com/YazarAyobami/ward/issues/16) | 1 | W-2.3 | XS | time: implement `scaled` |
| [#17](https://github.com/YazarAyobami/ward/issues/17) | 1 | W-2.3 | XS | time: implement `age_years` |
| [#18](https://github.com/YazarAyobami/ward/issues/18) | 1 | W-2.3 | XS | time: implement `periods_elapsed` |
| [#19](https://github.com/YazarAyobami/ward/issues/19) | 1 | W-2.4 | XS | rules: implement `validate_guardians` |
| [#20](https://github.com/YazarAyobami/ward/issues/20) | 1 | W-2.4 | XS | rules: implement `validate_shares` |
| [#21](https://github.com/YazarAyobami/ward/issues/21) | 1 | W-2.4 | XS | rules: implement `distinct_circles` |
| [#22](https://github.com/YazarAyobami/ward/issues/22) | 1 | W-2.4 | XS | rules: implement `requires_two_circles` |
| [#23](https://github.com/YazarAyobami/ward/issues/23) | 1 | W-2.4 | XS | rules: implement `is_rejected` |
| [#24](https://github.com/YazarAyobami/ward/issues/24) | 1 | W-2.4 | XS | rules: implement `circle_of` |
| [#25](https://github.com/YazarAyobami/ward/issues/25) | 1 | W-2.5 | XS | access: implement `assert_settlor` |
| [#26](https://github.com/YazarAyobami/ward/issues/26) | 1 | W-2.5 | XS | access: implement `assert_guardian` |
| [#27](https://github.com/YazarAyobami/ward/issues/27) | 1 | W-2.5 | XS | access: implement `assert_caregiver` |
| [#28](https://github.com/YazarAyobami/ward/issues/28) | 1 | W-2.5 | XS | access: implement `assert_child` |
| [#29](https://github.com/YazarAyobami/ward/issues/29) | 1 | W-2.5 | XS | access: implement `assert_dao` |
| [#30](https://github.com/YazarAyobami/ward/issues/30) | 2 | W-2.10 | S | token: implement `on_payout` rollback callback |
| [#31](https://github.com/YazarAyobami/ward/issues/31) | 2 | W-2.4 | XS | rules: implement `is_satisfied` |
| [#32](https://github.com/YazarAyobami/ward/issues/32) | 2 | W-2.4 | XS | rules: implement `allowance_due` |
| [#33](https://github.com/YazarAyobami/ward/issues/33) | 2 | W-2.4 | XS | rules: implement `remaining_share` |
| [#34](https://github.com/YazarAyobami/ward/issues/34) | 2 | W-2.6 | M | trust: implement `create_trust` |
| [#35](https://github.com/YazarAyobami/ward/issues/35) | 2 | W-2.8 | XS | settlor: implement `internal_deposit` |
| [#36](https://github.com/YazarAyobami/ward/issues/36) | 2 | W-2.9 | S | settlor: implement `withdraw` |
| [#37](https://github.com/YazarAyobami/ward/issues/37) | 2 | W-2.9 | S | guardian: implement `veto_withdrawal` |
| [#38](https://github.com/YazarAyobami/ward/issues/38) | 3 | W-2.11 | XS | views: implement `get_child_status` |
| [#39](https://github.com/YazarAyobami/ward/issues/39) | 3 | W-2.11 | XS | views: implement `get_allowance_due` |
| [#40](https://github.com/YazarAyobami/ward/issues/40) | 3 | W-2.7 | XS | trust: implement `add_child` |
| [#41](https://github.com/YazarAyobami/ward/issues/41) | 3 | W-2.7 | XS | trust: implement `set_dao` |
| [#42](https://github.com/YazarAyobami/ward/issues/42) | 3 | W-2.8 | XS | ft_on_transfer: parse `{"deposit": id}` and reject wrong tokens |
| [#43](https://github.com/YazarAyobami/ward/issues/43) | 3 | W-2.9 | XS | settlor: implement `execute_withdrawal` |

## P3 — Lifecycle & requests (16 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#44](https://github.com/YazarAyobami/ward/issues/44) | 1 | W-3.1 | S | guardian: implement `attest_death` |
| [#45](https://github.com/YazarAyobami/ward/issues/45) | 1 | W-3.10 | XS | requests: execute `ChildDeceased` in `execute_request` |
| [#46](https://github.com/YazarAyobami/ward/issues/46) | 1 | W-3.2 | S | settlor: implement `cancel_death_claim` |
| [#47](https://github.com/YazarAyobami/ward/issues/47) | 1 | W-3.3 | XS | trust: implement `finalize_activation` |
| [#48](https://github.com/YazarAyobami/ward/issues/48) | 1 | W-3.4 | S | caregiver: implement `claim_allowance` |
| [#49](https://github.com/YazarAyobami/ward/issues/49) | 1 | W-3.5 | S | caregiver: implement `create_request` |
| [#50](https://github.com/YazarAyobami/ward/issues/50) | 1 | W-3.6 | S | guardian: implement `approve` |
| [#51](https://github.com/YazarAyobami/ward/issues/51) | 1 | W-3.6 | XS | guardian: implement `reject` |
| [#52](https://github.com/YazarAyobami/ward/issues/52) | 1 | W-3.6 | XS | requests: execute `PayeePayment` in `execute_request` |
| [#53](https://github.com/YazarAyobami/ward/issues/53) | 1 | W-3.6 | XS | requests: execute `LargeSpend` in `execute_request` |
| [#54](https://github.com/YazarAyobami/ward/issues/54) | 1 | W-3.6 | XS | requests: execute `VouchCancel` in `execute_request` |
| [#55](https://github.com/YazarAyobami/ward/issues/55) | 1 | W-3.7 | XS | requests: execute `Unpause` in `execute_request` |
| [#56](https://github.com/YazarAyobami/ward/issues/56) | 1 | W-3.7 | XS | guardian: implement `pause` |
| [#57](https://github.com/YazarAyobami/ward/issues/57) | 1 | W-3.8 | XS | requests: execute `SetChildAccount` in `execute_request` |
| [#58](https://github.com/YazarAyobami/ward/issues/58) | 1 | W-3.8 | XS | child: implement `flag` |
| [#59](https://github.com/YazarAyobami/ward/issues/59) | 1 | W-3.9 | S | child: implement `claim_graduation` |

## P4 — DAO & testnet (5 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#60](https://github.com/YazarAyobami/ward/issues/60) | 1 | W-4.1 | S | council: implement `council_replace_guardian` |
| [#61](https://github.com/YazarAyobami/ward/issues/61) | 1 | W-4.1 | S | council: implement `council_set_caregiver` |
| [#62](https://github.com/YazarAyobami/ward/issues/62) | 1 | W-4.1 | S | council: implement `council_add_payee` |
| [#63](https://github.com/YazarAyobami/ward/issues/63) | 1 | W-4.2 | M | scripts: write `deploy-testnet.ts` · **maintainer** |
| [#64](https://github.com/YazarAyobami/ward/issues/64) | 1 | W-4.3 | M | scripts: write `seed.ts` · **maintainer** |

## P5 — Integration test suite (37 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#65](https://github.com/YazarAyobami/ward/issues/65) | 1 | W-5.1 | S | test: `circles::rejects_three_guardians_in_one_circle` |
| [#66](https://github.com/YazarAyobami/ward/issues/66) | 1 | W-5.1 | S | test: `circles::rejects_guardians_from_one_circle_only` |
| [#67](https://github.com/YazarAyobami/ward/issues/67) | 1 | W-5.1 | S | test: `circles::rejects_caregiver_as_guardian` |
| [#68](https://github.com/YazarAyobami/ward/issues/68) | 1 | W-5.1 | S | test: `circles::rejects_shares_not_summing_to_100_percent` |
| [#69](https://github.com/YazarAyobami/ward/issues/69) | 1 | W-5.1 | S | test: `circles::council_replace_breaking_circle_rule_fails` |
| [#70](https://github.com/YazarAyobami/ward/issues/70) | 1 | W-5.2 | S | test: `settlor_withdrawals::withdrawal_under_free_cap_is_instant` |
| [#71](https://github.com/YazarAyobami/ward/issues/71) | 1 | W-5.2 | S | test: `settlor_withdrawals::withdrawal_over_cap_is_delayed` |
| [#72](https://github.com/YazarAyobami/ward/issues/72) | 1 | W-5.2 | S | test: `settlor_withdrawals::two_circle_veto_cancels_withdrawal` |
| [#73](https://github.com/YazarAyobami/ward/issues/73) | 1 | W-5.2 | S | test: `settlor_withdrawals::no_withdrawal_while_death_claim_pending` |
| [#74](https://github.com/YazarAyobami/ward/issues/74) | 1 | W-5.3 | S | test: `death_flow::three_attestations_start_death_claim` |
| [#75](https://github.com/YazarAyobami/ward/issues/75) | 1 | W-5.3 | S | test: `death_flow::settlor_cancel_returns_to_funding` |
| [#76](https://github.com/YazarAyobami/ward/issues/76) | 1 | W-5.3 | S | test: `death_flow::second_cancel_without_vouch_fails` |
| [#77](https://github.com/YazarAyobami/ward/issues/77) | 1 | W-5.3 | S | test: `death_flow::activation_after_waiting_period_snapshots_shares` |
| [#78](https://github.com/YazarAyobami/ward/issues/78) | 1 | W-5.4 | S | test: `allowance::allowance_pays_once_per_period` |
| [#79](https://github.com/YazarAyobami/ward/issues/79) | 1 | W-5.4 | S | test: `allowance::allowance_max_one_period_arrears` |
| [#80](https://github.com/YazarAyobami/ward/issues/80) | 1 | W-5.4 | S | test: `allowance::allowance_works_while_paused` |
| [#81](https://github.com/YazarAyobami/ward/issues/81) | 1 | W-5.4 | S | test: `allowance::allowance_never_exceeds_balance` |
| [#82](https://github.com/YazarAyobami/ward/issues/82) | 1 | W-5.5 | S | test: `requests::payee_payment_needs_one_guardian` |
| [#83](https://github.com/YazarAyobami/ward/issues/83) | 1 | W-5.5 | S | test: `requests::large_spend_rejects_caregiver_circle_only` |
| [#84](https://github.com/YazarAyobami/ward/issues/84) | 1 | W-5.5 | S | test: `requests::large_spend_with_two_circles_executes` |
| [#85](https://github.com/YazarAyobami/ward/issues/85) | 1 | W-5.5 | S | test: `requests::two_circle_rejection_rejects` |
| [#86](https://github.com/YazarAyobami/ward/issues/86) | 1 | W-5.5 | S | test: `requests::request_limit_enforced` |
| [#87](https://github.com/YazarAyobami/ward/issues/87) | 1 | W-5.5 | S | test: `requests::pause_blocks_all_but_allowance` |
| [#88](https://github.com/YazarAyobami/ward/issues/88) | 1 | W-5.5 | S | test: `requests::unpause_needs_two_circles` |
| [#89](https://github.com/YazarAyobami/ward/issues/89) | 1 | W-5.6 | S | test: `children::set_child_account_needs_two_circles` |
| [#90](https://github.com/YazarAyobami/ward/issues/90) | 1 | W-5.6 | S | test: `children::child_flag_requires_age_14` |
| [#91](https://github.com/YazarAyobami/ward/issues/91) | 1 | W-5.6 | S | test: `children::flagged_request_needs_two_circles` |
| [#92](https://github.com/YazarAyobami/ward/issues/92) | 1 | W-5.6 | S | test: `children::graduation_pays_in_tranches` |
| [#93](https://github.com/YazarAyobami/ward/issues/93) | 1 | W-5.6 | S | test: `children::child_deceased_moves_share_to_siblings` |
| [#94](https://github.com/YazarAyobami/ward/issues/94) | 1 | W-5.6 | S | test: `children::add_child_only_while_funding` |
| [#95](https://github.com/YazarAyobami/ward/issues/95) | 1 | W-5.7 | S | test: `council::council_methods_reject_non_dao` |
| [#96](https://github.com/YazarAyobami/ward/issues/96) | 1 | W-5.7 | S | test: `council::council_add_payee_registers_storage` |
| [#97](https://github.com/YazarAyobami/ward/issues/97) | 1 | W-5.7 | S | test: `council::dao_never_moves_money` |
| [#98](https://github.com/YazarAyobami/ward/issues/98) | 1 | W-5.7 | S | test: `council::sputnik_proposal_replaces_guardian` |
| [#99](https://github.com/YazarAyobami/ward/issues/99) | 1 | W-5.8 | S | test: `transfer_failures::failed_payout_rolls_back` |
| [#100](https://github.com/YazarAyobami/ward/issues/100) | 1 | W-5.8 | S | test: `transfer_failures::time_scale_cannot_change` |
| [#101](https://github.com/YazarAyobami/ward/issues/101) | 1 | W-5.9 | S | lint: make clippy and rustfmt clean |

## P6 — Shared TypeScript core (18 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#102](https://github.com/YazarAyobami/ward/issues/102) | 1 | W-6.1 | XS | core: test the zod schemas against sample view JSON |
| [#103](https://github.com/YazarAyobami/ward/issues/103) | 1 | W-6.2 | XS | rules.ts: implement `validateGuardians` |
| [#104](https://github.com/YazarAyobami/ward/issues/104) | 1 | W-6.2 | XS | rules.ts: implement `validateShares` |
| [#105](https://github.com/YazarAyobami/ward/issues/105) | 1 | W-6.2 | XS | rules.ts: implement `distinctCircles` |
| [#106](https://github.com/YazarAyobami/ward/issues/106) | 1 | W-6.2 | XS | rules.ts: implement `isSatisfied` |
| [#107](https://github.com/YazarAyobami/ward/issues/107) | 1 | W-6.2 | XS | rules.ts: implement `allowanceDue` |
| [#108](https://github.com/YazarAyobami/ward/issues/108) | 1 | W-6.3 | S | contract.ts: implement `createViewClient` |
| [#109](https://github.com/YazarAyobami/ward/issues/109) | 1 | W-6.3 | XS | core: add settlor call builders |
| [#110](https://github.com/YazarAyobami/ward/issues/110) | 1 | W-6.3 | XS | core: add guardian call builders |
| [#111](https://github.com/YazarAyobami/ward/issues/111) | 1 | W-6.3 | XS | core: add caregiver & child call builders |
| [#112](https://github.com/YazarAyobami/ward/issues/112) | 1 | W-6.4 | XS | format.ts: implement `formatAmount` |
| [#113](https://github.com/YazarAyobami/ward/issues/113) | 1 | W-6.4 | XS | format.ts: implement `parseAmount` |
| [#114](https://github.com/YazarAyobami/ward/issues/114) | 1 | W-6.4 | XS | config.ts: implement `explorerTxUrl` |
| [#115](https://github.com/YazarAyobami/ward/issues/115) | 1 | W-6.4 | XS | config.ts: implement `explorerAccountUrl` |
| [#116](https://github.com/YazarAyobami/ward/issues/116) | 2 | W-6.3 | XS | contract.ts: implement `getTrustsFor` |
| [#117](https://github.com/YazarAyobami/ward/issues/117) | 2 | W-6.3 | XS | contract.ts: implement `getRequests` |
| [#118](https://github.com/YazarAyobami/ward/issues/118) | 2 | W-6.3 | XS | contract.ts: implement `getChildStatus` |
| [#119](https://github.com/YazarAyobami/ward/issues/119) | 2 | W-6.3 | XS | contract.ts: implement `getAllowanceDue` |

## P7 — Web app (17 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#120](https://github.com/YazarAyobami/ward/issues/120) | 1 | W-7.1 | S | web: write the landing page |
| [#121](https://github.com/YazarAyobami/ward/issues/121) | 1 | W-7.1 | S | web: build the `DemoModeBanner` component |
| [#122](https://github.com/YazarAyobami/ward/issues/122) | 1 | W-7.2 | S | web: build the `GuardianPicker` component |
| [#123](https://github.com/YazarAyobami/ward/issues/123) | 1 | W-7.2 | S | wallet.ts: implement `setupWallet` |
| [#124](https://github.com/YazarAyobami/ward/issues/124) | 1 | W-7.3 | S | web: build the `CircleBadge` component |
| [#125](https://github.com/YazarAyobami/ward/issues/125) | 1 | W-7.3 | S | web: build the `RulesSummary` component |
| [#126](https://github.com/YazarAyobami/ward/issues/126) | 1 | W-7.3 | S | web: build the `Timeline` component |
| [#127](https://github.com/YazarAyobami/ward/issues/127) | 1 | W-7.5 | S | web: build the `RequestCard` component |
| [#128](https://github.com/YazarAyobami/ward/issues/128) | 1 | W-7.5 | S | web: build the `ApprovalProgress` component |
| [#129](https://github.com/YazarAyobami/ward/issues/129) | 1 | W-7.9 | S | web: configure Vitest for React components |
| [#130](https://github.com/YazarAyobami/ward/issues/130) | 2 | W-7.2 | M | web: build the `/create` page |
| [#131](https://github.com/YazarAyobami/ward/issues/131) | 2 | W-7.3 | M | web: build the `/t/[id]` page |
| [#132](https://github.com/YazarAyobami/ward/issues/132) | 2 | W-7.4 | M | web: build the `/t/[id]/fund` page |
| [#133](https://github.com/YazarAyobami/ward/issues/133) | 2 | W-7.5 | M | web: build the `/t/[id]/guardian` page |
| [#134](https://github.com/YazarAyobami/ward/issues/134) | 2 | W-7.6 | M | web: build the `/t/[id]/caregiver` page |
| [#135](https://github.com/YazarAyobami/ward/issues/135) | 2 | W-7.7 | M | web: build the `/t/[id]/child` page |
| [#136](https://github.com/YazarAyobami/ward/issues/136) | 3 | W-7.8 | S | web: accessibility and mobile pass |

## P8 — Optional (Could) (2 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#137](https://github.com/YazarAyobami/ward/issues/137) | 1 | W-8.1 | M | AI receipt check: NEAR AI Cloud route + `post_ai_review` |
| [#138](https://github.com/YazarAyobami/ward/issues/138) | 1 | W-8.2 | S | web: 1Click dry-run quote on /fund |

## P9 — Demo script (10 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#139](https://github.com/YazarAyobami/ward/issues/139) | 1 | W-9.1 | S | demo: write step 1 as `scripts/demo/step1.ts` |
| [#140](https://github.com/YazarAyobami/ward/issues/140) | 1 | W-9.2 | S | demo: write step 2 as `scripts/demo/step2.ts` |
| [#141](https://github.com/YazarAyobami/ward/issues/141) | 1 | W-9.3 | S | demo: write step 3 as `scripts/demo/step3.ts` |
| [#142](https://github.com/YazarAyobami/ward/issues/142) | 1 | W-9.4 | S | demo: write step 4 as `scripts/demo/step4.ts` |
| [#143](https://github.com/YazarAyobami/ward/issues/143) | 1 | W-9.5 | S | demo: write step 5 as `scripts/demo/step5.ts` |
| [#144](https://github.com/YazarAyobami/ward/issues/144) | 1 | W-9.6 | S | demo: write step 6 as `scripts/demo/step6.ts` |
| [#145](https://github.com/YazarAyobami/ward/issues/145) | 1 | W-9.7 | S | demo: write step 7 as `scripts/demo/step7.ts` |
| [#146](https://github.com/YazarAyobami/ward/issues/146) | 1 | W-9.8 | S | demo: write step 8 as `scripts/demo/step8.ts` |
| [#147](https://github.com/YazarAyobami/ward/issues/147) | 2 | W-9.10 | XS | demo: wire steps into `scripts/demo.ts` |
| [#148](https://github.com/YazarAyobami/ward/issues/148) | 2 | W-9.9 | S | demo: capture public-ledger screenshots |

## P10 — Documentation, deployment, submission (10 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#149](https://github.com/YazarAyobami/ward/issues/149) | 1 | W-10.1 | S | README: problem and sources |
| [#150](https://github.com/YazarAyobami/ward/issues/150) | 1 | W-10.1 | S | README: how it works + diagram |
| [#151](https://github.com/YazarAyobami/ward/issues/151) | 1 | W-10.10 | S | Submit the hackathon form · **maintainer** |
| [#152](https://github.com/YazarAyobami/ward/issues/152) | 1 | W-10.3 | S | README: limitations and threat model |
| [#153](https://github.com/YazarAyobami/ward/issues/153) | 1 | W-10.4 | S | README: libraries and AI disclosure |
| [#154](https://github.com/YazarAyobami/ward/issues/154) | 1 | W-10.5 | S | Deploy the web app to Vercel (testnet) · **maintainer** |
| [#155](https://github.com/YazarAyobami/ward/issues/155) | 1 | W-10.7 | S | Record the demo video (≤ 2 min) · **maintainer** |
| [#156](https://github.com/YazarAyobami/ward/issues/156) | 1 | W-10.8 | S | Draft the X post · **maintainer** |
| [#157](https://github.com/YazarAyobami/ward/issues/157) | 2 | W-10.2 | S | README: 'do X, see Y' quickstart |
| [#158](https://github.com/YazarAyobami/ward/issues/158) | 2 | W-10.6 | S | README: screenshots |

## P11 — Final QA (6 issues)

| # | Wave | Roadmap | Size | Issue |
|---|---|---|---|---|
| [#159](https://github.com/YazarAyobami/ward/issues/159) | 1 | W-11.1 | XS | Full lint + test run |
| [#160](https://github.com/YazarAyobami/ward/issues/160) | 1 | W-11.2 | XS | Fresh-clone test using only the README |
| [#161](https://github.com/YazarAyobami/ward/issues/161) | 1 | W-11.3 | XS | AI-judge dry run |
| [#162](https://github.com/YazarAyobami/ward/issues/162) | 1 | W-11.4 | XS | Secrets audit of git history |
| [#163](https://github.com/YazarAyobami/ward/issues/163) | 1 | W-11.5 | XS | Docs consistency check |
| [#164](https://github.com/YazarAyobami/ward/issues/164) | 1 | W-11.6 | S | Commit history check · **maintainer** |
