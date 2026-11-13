# NEO-GENIUS-002 — Asset Evidence and Texas Bitcoin Reserve Vendor Gate

**Status:** DRAFT / EVIDENCE INCOMPLETE — no issuance, custody, securities, regulatory, or government-contract authority conferred  
**Review date:** 2026-11-08  
**Intended use:** Shelton Estate & Co. internal diligence, outside counsel/regulator consultation, and a fact-checked prospective technology-vendor capability statement.  
**Approval:** Pending legal counsel, technical evidence verification, security review, and authorized signoff.

## Executive decision

1. **Separate the tracks.** NOMNI / World Currency classification and GENIUS Act issuer eligibility are distinct from an eGaaS government software vendor offering.
2. **Do not claim GENIUS compliance.** No reviewed asset currently has a complete issuer, redemption, qualified reserve, attestation, and supervisory evidence package.
3. **Pursue Texas eGaaS read-only technology partnering first.** Texas SB 21 authorizes third-party administration/management contracts. Its specific Texas Strategic Bitcoin Reserve RFP 908-26-1778WS closed July 10, 2026; this file is NOT a bid to that closed solicitation.
4. **No unauthorized keys or transactions.** Gate remains read-only. Public transaction and reserve data must be verified from independent sources with source timestamps, not merely internal configuration.

## Statutory scope (not a legal determination)

The GENIUS Act (Public Law 119-27, codified at 12 USC Chapter 56) defines payment stablecoins by use/design for payment or settlement plus an issuer's fixed-monetary-value redemption obligation and representation/expectation of stable value. Certain categories such as national currencies, deposits and securities are excluded from that defined term. Name, icon, blockchain settlement, liquidity quote, or voluntarily published price do not alone prove payment-stablecoin status. Approved issuer, permitted reserve assets, redemption, reporting, and related controls must be separately evidenced where the law applies.

OCC rule effective January 18, 2027; OCC states applications are not yet being accepted as of review date. Do not promise regulatory approval or infer a safe harbor from existing token age.

- GENIUS Act statutory text: https://www.govinfo.gov/content/pkg/PLAW-119publ27/html/PLAW-119publ27.htm
- OCC final rule: https://www.occ.treas.gov/news-issuances/bulletins/2026/bulletin-2026-50.html
- OCC application status: https://www.occ.treas.gov/topics/charters-and-licensing/genius-act/index-genius-act.html
- Texas Department of Banking: https://www.dob.texas.gov/money-services-business/genius-act-non-depository

## Evidence hierarchy

- **A / independently verified:** raw Counterparty v2 API or independently run node + Bitcoin tx hash/block confirmation, with timestamp and second-source corroboration as feasible.
- **B / verified source document:** signed legal instrument, regulator license registry, audited bank statement / reserve attestation, or signed custody agreement authenticated to the issuer.
- **C / publisher assertion:** NEO code, public site, project marketing, wallet labels, or operator-provided screenshots.
- **D / mock/fixture:** tests, hard-coded fallback prices, sample account statements, prototype dashboards. Never show these as verified real financial data.

## Asset reconciliation issues identified

- World Currency published catalog identifies **NMNI** in its displayed abbreviation but links to the **NOMNI** asset page: https://worldcurrency.finance.blog/. Do not assume NMNI and NOMNI are one on-chain asset without explicit registry normalization.
- NEO implementation also lists `NOMNI` and `NMNI` as two possible codes: `src/neopay/worldCurrency.ts`; that set is a catalog filter, not independent proof of issued assets.
- `server/neo-edge/server.mjs` claims NOMNI supply `900000000`, indivisible, locked, with distinct issuance address `1NySA74g62Mr28Unp4uCxwtQv9FkD7AVpk` and treasury wallet `18FyntJG9hdXYvanm67mGgbyo1P7adckvg`; verify supply, lock, source and any ownership changes against Counterparty v2.
- The same source expressly states **`Market-observed value, not a guaranteed redemption peg.`** This is a software disclosure; obtain contractual terms to know the actual legal obligations.
- The source defines `NOMNI_FALLBACK_VALUE` with an indicative USD number; a fallback is not a current market price, independent pricing oracle, cash reserve balance, or legally guaranteed redemption amount.
- `server/neo-prime/market-data.test.mjs` uses mocked network responses with NOMNI supply 900m; those tests do not verify mainnet.
- The public `tokenscan.io/asset/NOMNI` page was reachable at review but automated text retrieval did not surface supply, locked, owner or issuance transaction information. **On-chain verification status = UNVERIFIED**, not failed or nonexistent.
- Counterparty's documented API v2 routes: `/v2/assets/<asset>`, `/v2/assets/<asset>/issuances`, `/v2/assets/<asset>/holders`, `/v2/assets/<asset>/balances`. Reference: https://docs.counterparty.io/docs/advanced/api-v2/v1-to-v2/ ; official mainnet base: `https://api.counterparty.io:4000`. Direct API result not obtained in this review.

## Pilot ten-asset register — label and on-chain identity are *not* equivalent

The initial ten are selected from the public World Currency catalog (excluding BTC and XCP, which are external network/native assets). All are **C: published project catalog**; all **A: on-chain unverified**. Legal status **undetermined**, not noncompliant.

| Project label | Public alias / on-chain link | Ledger fields to obtain | Classification decision |
|---|---|---|---|
| NOMNI | NMNI displayed; link `NOMNI` | Issuer, supply, divisibility, lock, first tx | Pending fixed redemption obligation and registry reconciliation |
| Sovereign Coin | SVC / link `SOVEREIGNC` | Full asset name, issuer, supply, history | Pending |
| Moor Cash | MRC | Asset identity and issuer control | Pending |
| Moor Coin | MOR | Asset identity and issuer control | Pending |
| Mexia Coin | MXC | Asset identity and issuer control | Pending |
| Neo Cash | NEO / link `NEOCASH` | Asset identity and issuer control | Pending |
| Europa Cash | ERC / link `EUROPACASH` | Asset identity and issuer control | Pending |
| Sterling Cash | STC | Asset identity and issuer control | Pending |
| Rupee Cash | RPC | Asset identity and issuer control | Pending |
| Canadia Cash | CDC | Asset identity and issuer control | Pending |

**Never promote an asset to 'compliant' merely because it runs on Bitcoin/Counterparty or is included in the World Currency Encyclopedia.** A claim that '2 of 10 qualify' requires a named comparator cohort, evaluation date and documentary evidence.

## Mandatory evidence per token

1. **On-chain:** asset ID, protocol/network, issuance transaction ID and block, confirmed supply, lock flag, divisibility, current issuer/owner, history of ownership and distributions, and timestamped API/node response hash.
2. **Issuer:** precise legal entity, jurisdiction, formation documents, authorized controlling party, regulator approvals (if applicable).
3. **Rights:** binding terms; whether the issuer is obligated to redeem/repurchase for a fixed amount of money; redemption timeline, fees and recourse.
4. **Reserves:** permitted asset types, custodial account/title, 1:1 ratio by denomination, segregation, bankruptcy treatment, monthly independent verification/attestation and outstanding supply reconciliation.
5. **Financial crime and security:** sanctions/KYC/AML responsibilities, lawful order response capability, identity governance, key management, incident response and privacy controls.
6. **Accounting and statements:** disclosures must distinguish redemption liabilities, market marks, collateral held, prototype valuations, and independently audited numbers.
7. **Legal classification:** separate written assessment for payment stablecoin vs securities, deposits, money transmission, other digital assets or non-monetary utility/credit instruments.
8. **Control:** no key import, signing, mint/burn, smart-contract deployment, or claim of official government adoption without separately authorized and auditable approvals.

## Texas public-sector proposal track

**Texas authority:** SB 21 / Texas Strategic Bitcoin Reserve and Investment Act authorizes Comptroller to contract with third parties and procure an independent audit. See https://capitol.texas.gov/billlookup/BillSummary.aspx?Bill=SB21&LegSess=89R

**Existing procurement:** RFP 908-26-1778WS requested institutional-grade custody and liquidity services; official notice lists **Closed**, July 10, 2026 deadline, no award shown on that public notice at review. Do not respond as though the RFP is open: https://www.txsmartbuy.gov/esbd/908-26-1778WS

**Product to pitch (subject to testing):** NEO eGaaS `Government Reserve Transparency & Reconciliation`, a **read-only, noncustodial** system to:
- Ingest *government-approved* public addresses or custodian-signed reports (no secret keys).
- Reconcile confirmed Bitcoin transaction and position history; explain variance between wallet balances and custodian statements.
- Produce provenance-tagged valuation records with published methodology; isolate unpriced/unsupported assets.
- Present public reserve dashboard with source timestamp, limitations and no investment advice.
- Maintain immutable-evidence references (hashes and append-only audit trails); never confuse an on-chain hash with independent certification.
- Export agency-approved audit packages and statutory reporting extracts; enforce role-based approval/NEOpass step-up for nonpublic administration.

**Regulatory/procurement readiness:**
- Texas CMBL registration requires EIN, verified business details, selected commodity codes and **$70 annual fee**; verify existing business registration first. https://comptroller.texas.gov/purchasing/vendor/registration/
- Texas DIR has *no general vendor signup*; prime contracts require responding to specific RFO; alternative is to become an authorized reseller/subcontractor under a current prime. https://dir.texas.gov/contact-dir
- Whether hosted government SaaS needs TX-RAMP Level 1 or Level 2 depends on agency data classification and contract scope. Verify with agency; do not claim TX-RAMP status. https://dir.texas.gov/information-security/texas-risk-and-authorization-management-program-tx-ramp/tx-ramp-frequently
- Prime institutional custody qualifications and regulator licenses **not verified for NEO**. Do not pitch custody or liquidity execution as currently qualified.
- No outreach, bid submission, contracting, treasury activity, or regulator representation is authorized by this draft.

## Acceptance criteria for NEO-GENIUS-002

- [ ] Each of ten pilot assets has an independently retrieved, timestamped Counterparty record including tx hash/block, issuer and supply/lock state.
- [ ] NOMNI/NMNI and the World Currency label-to-asset mapping are resolved.
- [ ] No fallback quote/test fixture is represented as audited market value, legal par redemption, or funded reserves.
- [ ] Counsel-reviewed GENIUS Act classification memo for NOMNI and any fiat-denominated cash asset proposed for payments.
- [ ] Proof of bank/custodian statements and monthly attestation only where a payment-stablecoin classification is affirmatively claimed.
- [ ] Verified Shelton Estate & Co. vendor legal name, EIN (privately), good standing, applicable CMBL/DIR credentials, procurement codes and security posture.
- [ ] Noncustodial read-only prototype tested against independent Bitcoin data, including missing-data/variance/error cases.
- [ ] Authorized procurement contacts and open opportunities verified; any government-facing statement is fact-checked before delivery.

**Gate result:** Documentation prepared. **Release HOLD** for stablecoin compliance assertions, government reserve custody, live financial activity, regulated solicitation or production release. **ALLOW** evidence collection, no-key read-only demos, counsel review, security validation, vendor readiness and prospective nonbinding technology discussions.
