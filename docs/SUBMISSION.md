# Ward — Hackathon Submission & Launch Guide

> This document contains all pre-drafted assets for hackathon submission, the official X launch post, and the 2-minute demo video storyboard.

---

## 1. Hackathon Submission Form Answers

### Project Title
**Ward**

### Tagline
*A children's trust on NEAR that no single relative can empty.*

### Problem Statement
In many developing economies across Sub-Saharan Africa and Southeast Asia, "property grabbing"—the expropriation of property and funds from vulnerable widows and orphans following the death of a breadwinner—affects an estimated 30% to 40% of bereaved families (World Bank, Human Rights Watch). 

Traditional crypto wallets fail to solve this problem: giving an uneducated child a private key or granting complete custody to a single guardian simply creates a single point of failure and invites embezzlement.

### Solution Overview
Ward is an autonomous on-chain trust built in Rust on NEAR that protects children's educational and living inheritance through multi-circle social governance:
1. **Circle Diversity Invariant:** Guardians are partitioned into independent social circles (`Maternal`, `Paternal`, `Institution`, `Community`). With a hard cap of $\le 2$ guardians per circle and a fixed consensus threshold of 3 approvals, no single clan or family faction can ever pass a proposal alone.
2. **Direct Payee Payouts:** High-value disbursements (such as school tuition or verified medical bills) are routed directly to registered payee accounts (`school.testnet`), completely bypassing the caregiver's personal wallet.
3. **Child Beneficiary Sovereignty:** Adolescents aged 14 and older hold an autonomous veto flag over disputed spends. Upon reaching adulthood (18), beneficiaries claim their inheritance directly into sovereign self-custody accounts across scheduled graduation tranches.
4. **Anti-Theft Timelocks:** Settlor withdrawals above the free cap are timelocked, allowing guardians across 2 distinct circles to veto unauthorized transfers if the parent's phone is stolen.
5. **Chain Abstraction:** Settlors living abroad can fund trusts with any token across chains (Tron, Ethereum, Solana, Bitcoin) via NEAR Intents and Chain Signatures MPC.

### Testnet Contract, Explorer & Live App
- **Live Web App:** [https://ward-app-tawny.vercel.app](https://ward-app-tawny.vercel.app)
- **Demo Video:** [`docs/demo.mp4`](docs/demo.mp4) (105-second MP4 walkthrough)
- **Ward Smart Contract:** `ward.testnet` ([NearBlocks Explorer](https://testnet.nearblocks.io/address/ward.testnet))
- **Mock FT Token (tUSDC):** `tusdc.testnet` ([NearBlocks Explorer](https://testnet.nearblocks.io/address/tusdc.testnet))
- **Demo Trust #0:** "Ada & Tobi Education & Care Trust" ([View on Live App](https://ward-app-tawny.vercel.app/t/0))

### Technical Highlights
- **191 unit tests** in Rust with 100% pass rate.
- **7 near-workspaces sandbox integration suites** verifying real multi-contract transactions with pinned Sputnik DAO v2 wasm.
- **Pure TypeScript rule engine** (`@ward/core`) replicating 100% of Rust contract rules on the frontend.
- **12 Vitest suites (48 tests)** covering all React components, forms, and accessibility.
- **PRD §8 Acceptance Test:** `pnpm demo` executes all 9 end-to-end user journeys in < 1 second.

---

## 2. X (Twitter) Announcement Draft (W-10.8)

> **Note:** Post only upon explicit maintainer review.

```text
Across Sub-Saharan Africa, over 30% of orphans lose their inheritance to predatory relatives ("property grabbing").

Giving a single relative a crypto private key doesn't fix this—it makes it worse.

Introducing Ward (@WardProtocol) on @NEARProtocol 🧵👇

1/ The Problem
When a breadwinner passes away, traditional wills take years in probate courts, and digital wallets leave funds vulnerable to the single person holding the seed phrase. Predatory relatives frequently drain estates before children finish school.

2/ The Invariant
Ward solves this with "Circle Diversity":
Guardians belong to independent circles (Maternal, Paternal, Institution, Community). 
Rule: max 2 guardians per circle. Quorum requires 3 votes. 
Result: No single family clan can ever collude alone to drain the trust.

3/ Direct-to-Payee Routing
Caregivers don't touch school tuition. Payments for registered payees (like Greenhills Academy) are disbursed by smart contract directly to the school's account, with SHA-256 invoice verification.

4/ Child Rights at 14 & 18
• At 14: Adolescents can trigger an emergency on-chain flag on suspicious expenses, forcing 2-circle consensus.
• At 18: Beneficiaries claim their inheritance directly to their own sovereign NEAR wallets across 3 graduation tranches.

5/ Multichain Funding
Using NEAR Chain Abstraction and Intents, parents working abroad can deposit USDT from Tron, ETH, or BTC into a trust on NEAR without requiring caregivers to manage cross-chain bridges.

Built with Rust, near-sdk 5.30, Sputnik DAO v2, and Next.js.
Verified with 191 contract tests and an executable acceptance test suite.

Explore the code & live testnet deployment:
🔗 https://github.com/YazarAyobami/ward
```

---

## 3. Demo Video Storyboard (<= 2 Minutes) (W-10.7)

| Timecode | Visual / Screen | Narration / Action |
|---|---|---|
| **0:00 - 0:25** | Landing page (`/`) & Create Trust Wizard (`/create`) | Introduce the property-grabbing problem. Walk through creating the "Ada & Tobi" trust. Show live validation enforcing 4 guardians across Maternal, Paternal, Institution, and Community circles. |
| **0:25 - 0:50** | Fund Portal (`/t/0/fund`) & Guardian Attestation | Settlor deposits 2,000 tUSDC with Tron-to-NEAR cross-chain quote simulation. Simulate death confirmation: 3 guardians across distinct circles submit attestations; trust status transitions from `Funding` to `Active`. |
| **0:50 - 1:15** | Caregiver (`/t/0/caregiver`) & Guardian Inbox (`/t/0/guardian`) | Uncle caregiver claims monthly 500 USDC living allowance. Uncle requests 1,500 USDC for "medical bills"; Community pastor rejects after invoice discrepancy check. School tuition request is approved by Teacher and sent directly to `school.testnet`. |
| **1:15 - 1:40** | Security & Child Rights (`/t/0/child`) | Demonstrate stolen-phone attack: 1,500 USDC unauthorized withdrawal is timelocked and vetoed by Aunt + Teacher. Ada turns 14, exercises emergency flag veto. At 18, Ada claims her 1/3 graduation tranche. |
| **1:40 - 2:00** | Public Ledger (`/t/0`) & Terminal `pnpm demo` | Show transparent on-chain audit ledger. Switch to terminal and run `pnpm demo`: show all 9 PRD acceptance steps executing cleanly in under 1 second. |
