# NEO-GENIUS-010 — Counterparty Genesis/Lock Evidence, Orange Chip Issuer Pack & Houston Site Control
**Reviewed:** 2026-11-08, America/Chicago. **Status: DRAFT / EVIDENCE GATES NOT APPROVED.**  
**Base:** Gate 009 draft branch / PR #1378, itself stacked on #1362 → #1361 → #1360 → #1359. Gate 003 #1357 remains separate draft. This gate has **NO wallet signing, transfer, issuance, sale, investor solicitation, government bid, contract, property deposit or deployment**.

## 1. NOMNI — exact evidence and classification

**Public asset observations** reported by live CounterPay read-only address queries in Gate 008:
- NOMNI token metadata: indivisible, issuance-locked, original issuer \`1NySA74g62Mr28Unp4uCxwtQv9FkD7AVpk\`, reported current asset owner \`18FyntJG9hdXYvanm67mGgbyo1P7adckvg\`.
- Three public addresses showed **166,414,131**, **101,898,388**, and **34** NOMNI respectively, aggregating **268,312,553 only in those wallets**. This is not the outstanding supply.
- Independent Horizon Market publisher reports **900,000,000** supply, 837 holders and locked status. Not independently reconstructed genesis+issuance events, and not a liquid-market valuation.

**Historical owner-address verification evidence newly found**:
- CoinDaddy's NOMNI page (https://whois.coindaddy.io/xcp/asset/NOMNI) reports a proof-of-ownership payment involving address \`18FyntJG9hdXYvanm67mGgbyo1P7adckvg\` to verification address \`1Proofn4XbGRE9Puxd594A4XPjEMzpppKK\`.
- Reports TXID **\`02b553692692fc4db8400f0433a8599969ea6340b92e60b72e83647abd17b7f7\`**, Bitcoin block **458112**, UTC **2017-03-20T12:34:47Z**, amount **0.00025250 BTC**.
- The separately connected CounterPay transaction-status reader returned \`confirmed: true\`, \`block_height:458112\`. **The check confirms Bitcoin transaction status but does not prove the transfer's actual inputs/outputs or signed address control.**
- CoinDaddy page includes both "owner has NOT verified" and "owner has verified ... with a proof-of-ownership deposit" boilerplate on the same page; treat its verification table as **historical publisher assertion with a confirmed Bitcoin transaction**, not definitive owner evidence. CoinDaddy other asset pages may reference the same deposit, so this is likely an address-level verification artifact, not a unique NOMNI issuance.
- **Critically, this 2017 TXID is NOT NOMNI's original issuance/creation transaction and not a current proof of control or legally enforceable redemption right.** No current wallet signature or issuer authority has been received.
- Historical record with raw status caveats is in \`data/compliance/nomni-2017-coindaddy-verification-010.json\`.

**Original genesis/lock transactions:** NOT captured. The public TokenScan API and Counterparty v2 docs specify issuance endpoints, but direct JSON from those endpoints could not be retrieved through available public web/container access. The web TokenScan page does not render issuance table records for source inspection. **Never invent TXIDs, block heights, earliest issuance date, nominal value or issuer reserves.**

**What changed in code this gate:** The Gate 009 parser incorrectly assumed TokenScan and Counterparty v2 \`quantity\` units were identical. Official TokenScan documentation returns human-unit decimal strings (e.g., \`0.00000000\`) and optional \`/page/limit\` suffix, while Counterparty v2 rows can use base-unit integer quantities. \`server/neo-genius/issuance-history-proof.mjs\` now:
1. Allows only a fixed official API host/path shape; no arbitrary HTTP hosts, credentials, query strings or asset-path confusion.
2. Parses TokenScan quantities with decimal scaling to base units only if token divisible; no fractional indivisible units.
3. Preserves Counterparty v2 raw quantities in base units; no multiplying them by 10^8.
4. Records reported totals and requested page attribution, but **never** infers completeness, genuine BTC confirmations, issuer control, total supply, issuance lock, market price, reserve backing or legal compliance.
5. Keeps all issuance events as **unverified API candidate records**, never production treasury state. Code performs no network requests, wallet actions or signing.
6. Eight additional regression cases in \`issuance-history-provider-compat.test.mjs\`, plus ten prior cases inherited from Gate 009.

**Source URLs:** https://tokenscan.io/api ; https://docs.counterparty.io/docs/advanced/api-v2/v1-to-v2/ ; https://horizon.market/assets/NOMNI ; https://whois.coindaddy.io/xcp/asset/NOMNI

## 2. STANSHARES / KNOWINDEX — enforceable capital rights

The public wallet reader previously reported **STANSHARES 1,000** and **KNOWINDEX 1,000** indivisible units in the Orange Chip listing address \`1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8\`. Both \`locked=false\`; the observed wallet balance does **not** determine fixed total supply, authorized company shares, capitalization, ownership of corporate profits or securities offering authorization.

**Draft completed:** \`docs/orange-chip/STANSHARES-ISSUER-AUTHORIZATION-010-DRAFT.md\`. This unsigned template requests:
- Verified James A. Stanback Inc. legal name, formation status, directors/officer authority, adopted corporate resolution and notarization/witnessing where applicable.
- Authorized/issued/outstanding/treasury/reserved share reconciliation with signed capitalization records and anti-dilution protections.
- Token genesis/supply/owner history, signed address proof by authorized controller, legal share-to-token mapping and enforceable contractual voting/dividend/transfer rights.
- Counsel review of securities offering registration/exemption, transfer agent, broker/intermediary/ATS and AML/KYC requirements before any offering or transfer.
- No automatic on-chain supply lock or transfer until real issuer authorization and compliance checks. **Not an issuer-executed legal document.**

KNOWINDEX requires a separate issuer board packet; it is not authorized by STANSHARES paperwork.

## 3. Government procurement: TEA bond transparency

RFO 701-26-015 is a school bond public reporting and data-platform procurement, NOT a purchase order for World Credits, NOMNI, Orange Chip securities or government crypto reserve assets.

| Dependency | Evidence by Nov 8 | Action |
|---|---|---|
| Euna Procurement registration | Connected Gmail says "Almost done: Complete your registration" | Owner complete secure email/browser activation |
| CMBL | Owner correspondence says Texas vendor account exists under LARRY SHELTON ESTATE; paid listing fee pending | Independently verify vendor account and fee if pursuing CMBL |
| Carahsoft Texas Education IT partner | Nonbinding inquiry sent Nov 8; no reply observed | Wait for response; seek written opportunity-specific prime/teaming interest |
| Written RFO questions | Due Nov 13, 2026 2 p.m. Central, via Euna (Bonfire) Vendor Discussions | Review all attachments/addenda; only ask unaddressed, necessary questions |
| Response | Due Dec 8, 2026 2 p.m. Central | Only after qualified prime (or independently capable team), insurance, staffing, VetHUB, TX-RAMP, accessibility, legal and commercial signoff |

**Solo prime bid remains HOLD.** Qualified subcontract capture may proceed nonbinding, with counsel protecting NEO IP and negotiating security, insurance, deliverable acceptance, confidentiality and indemnity flow-down. Do not represent Carahsoft's DIR contract as a decision to bid or a signed partnership.

## 4. NEO Houses — owner-authorized property evidence

**Confirmed calendar:** Tuesday Nov 10, 2026, 10:00–10:30 a.m. Central with Earlsneuk Building Group contact Conar Cabucio.

The builder's November 7 report of **seven completed homes plus fifteen undeveloped lots** is not verified title/site control, a 22-unit rental building, or available stock for sale. The "low $300Ks" remark lacks a verified unit/lot basis. No signed owner parcel map or financing terms appeared in the reviewed Gmail.

**Draft meeting packet:** \`docs/neo-houses/EARLSNEUK-2026-11-10-MEETING-PACKET-010.md\` with 30-minute agenda, original owner authority, parcel IDs, exact pricing, 2–4 home starter program, cost/schedule, and separate completed-home/land-option/JV scenarios.

The City of Houston 2026 HOME multifamily NOFA application cutoff is Nov 9 at 5 p.m. Central. No verified qualified project/application/award is evidenced; do not submit based on speculative sites.

**Dixie / Contempo:** Earlier repeated broker requests are in sent Gmail; no new authenticated T12/rent roll/seller authority reply found in this gate. Do not send duplicate documents requests on the same day.

## 5. Gate decision

| Lane | Authorization |
|---|---|
| Private technical source validation and review | PROCEED |
| Read-only historical BTC status check | COMPLETED (confirmed TX in 458112; no inputs/out proof) |
| NOMNI genesis / independently certified total issuance and lock | HOLD pending raw confirmed issuance TXIDs, independent node and complete issuance history |
| STANSHARES/KNOWINDEX legally issued securities, market or funding activity | HOLD pending signed actual issuer/SEC-law documentation |
| TEA prime bid and submission | HOLD pending Euna, prime/team, insurance/security/flow-down |
| NEO Houses developer information meeting | PROCEED nonbinding on scheduled date |
| Property acquisition, public grant filing, claims of cash backing | HOLD absent verified authority/eligibility |
| PR merge / live promotion | HOLD pending CI, source review, staged branch conflict resolution and stakeholder approvals |

**Next recommended gate NEO-GENIUS-011:** finalize independently verified issuance blocks, owner-rights documents, actual NEO Houses parcel schedule, and qualified government prime partner submission path. Avoid adding more software scaffolding when documentary evidence is the actual blocker.
