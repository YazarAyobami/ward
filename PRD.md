# Ward — Product Requirements Document

> A children's trust that the family can't empty.
> NEAR Hackathon 2026 · Primary track: **Social Money** · Secondary: Real-World Money, Privacy & Private AI (optional AI module)
> Build window: 1–14 Nov 2026 (submission deadline 14 Nov 23:59 UTC)

---

## 1. Problem

When a parent dies in much of sub-Saharan Africa, relatives often seize the money and property meant for the surviving spouse and children ("property grabbing").

- Uganda: ~30% of widows report property grabbing; in one Mukono District study, 548 of 1,806 widows surveyed were victims.
- Namibia: 44% of widows/orphans lost cattle, 39% lost farm equipment.
- Zambia: one legal clinic handles 700+ property-grabbing cases a year with 8 lawyers for the whole country.
- Most victims never pursue legal action — courts are slow, expensive, and suing in-laws is socially costly.

Existing crypto inheritance tools solve "how do my heirs get my money". None solve **"how do I protect my heirs from the people who are supposed to look after them."**

## 2. Product in one sentence

A parent, while alive, builds a savings trust for their children whose money — after the parent's death — can only flow to the children under rules no single relative can override.

## 3. Users

| Persona | Who | What they need |
|---|---|---|
| **Parent (Settlor)** | Working parent, often with relatives abroad or in the city; 25–55 | Save for kids gradually from any token/chain; choose guardians; be sure nobody can drain it after death; cancel a false death claim |
| **Guardian** | 3–5 people the parent trusts from *different circles*: mother's side, father's side, teacher, faith leader, NGO | Simple approve/reject screen; see every request and the history; pause if something looks wrong |
| **Caregiver** | Whoever raises the child after the death (often a relative) | Predictable monthly allowance; a way to request school fees or larger amounts |
| **Child (Beneficiary)** | The child | From 14: see everything, raise a flag. At 18: full control |
| **Payee** | School, clinic, landlord | Receive payment directly, see that it came from the trust |
| **Judge / reviewer** | Hackathon judges + AI screeners | Run the demo end-to-end on testnet in minutes, verify every README claim |

## 4. Goals and non-goals

**Goals (hackathon scope)**
1. Parent can create a trust, fund it, and appoint guardians tagged by circle.
2. A death-confirmation flow with a quorum + cancellable waiting period.
3. Post-death rules enforced on-chain: capped allowance, direct-to-payee school fees, cross-circle approval for large spends, pause, age-based child rights, handover at 18.
4. Council governance through an existing Sputnik DAO (no custom multisig).
5. A public, readable ledger page per trust.
6. A one-command demo on testnet with timers shrunk to minutes.

**Non-goals**
- Protecting land, houses or livestock (money only — stated plainly).
- Legal recognition as a will or trust instrument.
- Fiat off-ramp to local bank accounts (payees are NEAR accounts in the demo).
- KYC of guardians or death certificates verification against government registries.

## 5. Core user stories

### Parent
- P1. As a parent I create a trust for one or more children, set each child's date of birth, and name the caregiver role.
- P2. I add 3–5 guardians and tag each with a circle (`maternal`, `paternal`, `community`, `institution`). The system rejects a guardian set that doesn't span at least 2 circles or has more than 2 guardians in one circle (so any 3 approvals always span 2 circles).
- P3. I deposit stablecoins at any time, including from another chain/token (NEAR Intents 1Click — mainnet only; testnet uses a mock stablecoin + dry-run quote).
- P4. I set the rules: monthly allowance, school-fee payees, large-spend threshold, waiting period.
- P5. If guardians start a death confirmation while I'm alive, I cancel it with one transaction. A second cancel within a short window needs one guardian to vouch that I'm alive (so someone holding my phone after my death can't block activation forever).
- P6. While I'm alive, I can withdraw my own deposits: small amounts instantly, larger amounts after a delay during which guardians from 2 circles can veto (protects the trust if my phone is taken). No withdrawals while a death claim is pending.
- P7. I can add a child born after the trust was created, and set each child's fixed share.

### Guardian
- G1. I attest a parent's death and attach an evidence hash (e.g., certificate photo hash).
- G2. I approve or reject a spend request and see which circles have already approved.
- G3. I pause all non-allowance payments if I suspect abuse; unpausing needs approvals from 2 circles.
- G4. I vote on membership changes (replace a guardian, change caregiver, add a payee) through the Sputnik DAO. The DAO never moves money.
- G5. I veto a large settlor withdrawal that looks like someone else is using the parent's phone.
- G6. I approve setting the child's own account (needs 2 circles, so the caregiver can't register an account they control).

### Caregiver
- C1. I receive the monthly allowance automatically (claimable each period) — I can't raise it.
- C2. I request a school-fee payment to a registered payee; one guardian approves; the school is paid directly.
- C3. I request a large one-off amount (e.g., medical) with a reason and receipt; it needs approvals from ≥2 different circles.

### Child
- K1. From age 14, I can raise a flag on any request; a flag pauses it until guardians from 2 circles clear it.
- K2. At 18, I claim my share. It's paid in tranches (default 3, one per month), and any guardian can pause in between if something looks wrong.
- K3. If a sibling dies before 18, their share passes to the surviving siblings, then to named fallback beneficiaries.

### Anyone
- A1. I open the trust's public page and see balance, rules, guardians (by circle), every request, vote and payment.

## 6. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| F1 | Trust lifecycle: `Funding → DeathClaimed → Active → Graduating → Closed`, plus a `paused` flag | Must |
| F2 | 3–5 guardians, ≤2 per circle, ≥2 circles; death confirmation = 3 attestations (cross-circle by construction) | Must |
| F3 | Waiting period after the death quorum; the settlor can cancel; a 2nd cancel in the window needs a guardian vouch | Must |
| F4 | Monthly allowance: fixed amount per period, claimable by the caregiver, at most 1 period of arrears, works while paused | Must |
| F5 | Registered payees (school/clinic): payment goes to the payee account only, 1 guardian approval | Must |
| F6 | Large spend (> threshold): approvals from ≥2 circles, at least one ≠ the caregiver's circle | Must |
| F7 | Membership changes (replace guardian, change caregiver, add payee) through a Sputnik DAO proposal with a fixed weight of 3; the DAO never moves money | Must |
| F8 | Pause by any single guardian; unpause needs 2 circles | Must |
| F9 | Child flag from 14; child account set by a 2-circle request; graduation at 18 in tranches | Must |
| F10 | Settlor withdrawals: instant up to a free cap, otherwise delayed with a 2-circle veto; none while a death claim is pending | Must |
| F11 | Fixed child shares; a deceased child's share goes to siblings, then fallback beneficiaries | Must |
| F12 | Ward registers token storage (`storage_deposit`) for every payee and child account, paid from the trust's NEAR ops balance | Must |
| F13 | Public ledger page per trust (reads the chain directly) | Must |
| F14 | Demo mode: all durations scaled (e.g., 1 month = 60 s), fixed at trust creation | Must |
| F15 | Any-chain funding: 1Click dry-run quote display on testnet | Should |
| F16 | AI receipt check: a TEE-hosted model compares the receipt to the request, with attestation shown (advisory only) | Could |
| F17 | Guardian notifications; social login plus gas relayer for guardians who don't use crypto | Could |

## 7. Non-functional requirements

- **Trust-minimised**: rules live in the contract; no admin key can change them except the trust's own DAO.
- **Reproducible**: `pnpm demo` runs the full story on testnet and prints explorer links.
- **Readable**: every rule in the UI is shown in plain language ("Allowance: 150 USDC every month to caregiver.near").
- **Low cost**: guardian actions cost < 0.01 NEAR; a relayer can sponsor guardian gas (stretch).
- **Privacy**: no child names on-chain — trust uses a label + hashed metadata; documents stored off-chain, only hashes on-chain.

## 8. Demo script (what judges will see)

1. Parent creates trust "Ada & Tobi", adds 4 guardians: aunt (maternal), uncle (paternal), teacher (institution), pastor (community).
2. Parent deposits 2,000 tUSDC (and shows a real 1Click dry-run quote "pay from USDT on Tron").
3. Three guardians across 2 circles attest death → waiting period (2 min) → trust becomes Active.
4. Caregiver (uncle) claims allowance → OK. Uncle requests 1,500 tUSDC "medical bills" → needs 2 circles; uncle can't approve his own; pastor rejects after AI receipt check flags mismatch.
5. Caregiver requests school fees → teacher approves → paid straight to `school.testnet`.
6. Uncle and the other paternal guardian try to swap the teacher for a cousin through a DAO proposal. It needs 3 votes, and with ≤2 guardians per circle the paternal side can't pass it alone.
7. Replay before step 3 (second trust): someone holding the parent's phone tries to withdraw 1,500. It's delayed, and the aunt and teacher veto it.
8. Fast-forward: the child turns 14 and flags a request; the guardians set the child's own account; at 18 the child claims their share in 3 tranches.
9. Public ledger page shows the entire history.

## 9. Success metrics (hackathon)

- AI screener can run `pnpm demo` and every README claim maps to a passing test.
- Full demo under 5 minutes of wall-clock time.
- ≥90% of contract logic covered by integration tests (near-workspaces).

## 10. Risks and open questions

| Risk | Mitigation |
|---|---|
| Guardians collude | Require circle diversity; any single guardian can pause; child flag; public ledger |
| False death claim | Quorum across circles + waiting period + settlor cancel |
| Settlor dies before the trust is funded enough | Out of scope; UI shows "funded months of allowance" |
| Sputnik DAO vote policy is OR across roles, not AND | ≤2 guardians per circle plus a fixed DAO weight of 3 makes approvals cross-circle by construction; spends never go through the DAO |
| Someone holding the dead parent's phone | Withdrawal delay plus guardian veto; no withdrawals during a claim; 2nd cancel needs a vouch |
| Caregiver controls the child's key | Child account set by a 2-circle request; graduation in tranches |
| Guardians who don't use crypto | Documented gap; social login plus gas relayer is the next step |
| No testnet for NEAR Intents | Mock stablecoin on testnet; real dry-run quotes; mainnet path documented |
| Legal status | README states it complements a will; it does not replace one |

## 11. Milestones (11 days)

> Summary only. The detailed, live plan with task IDs, acceptance criteria and status is **`ROADMAP.md`**, which is updated in every contribution.

| Day | Deliverable |
|---|---|
| 4–5 Nov | Contract skeleton: trust, guardians (circle rules), deposit, settlor withdrawals with delay/veto, lifecycle; tests |
| 6–7 Nov | Death flow (vouch on 2nd cancel), allowance, payees and storage, requests and approvals, pause, children and graduation; tests |
| 8 Nov | Sputnik DAO integration (membership changes only) |
| 9–10 Nov | Web UI: create trust, guardian inbox, caregiver requests, child page, public ledger |
| 11 Nov | Demo script, time scaling, 1Click dry-run quote; AI receipt check only if ahead of schedule |
| 12 Nov | README (machine-readable "do X, see Y"), LICENSE, polish |
| 13 Nov | Demo video, X post |
| 14 Nov | Submit (before 23:59 UTC) |
