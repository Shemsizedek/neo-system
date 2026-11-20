# NEO-GENIUS-009 — Partner Response Intelligence, Counterparty Issuance Proof and Orange Chip Rights Gate

**Review timestamp:** 2026-11-08, America/Chicago  
**Gate status:** TECHNICAL EVIDENCE / NONBINDING PROCUREMENT DEVELOPMENT — NO LIVE ASSET ISSUANCE, SECURITIES OFFERING, CONTRACT, PUBLIC RESERVE ATTESTATION, PROPERTY COMMITMENT OR GOV'T BID.  
**Stacked branch:** Review against \`feat/neo-genius-008-prime-and-asset-evidence\` (draft PR #1362), ultimately dependent on #1361/#1360/#1359. The original reserve observer #1357 remains a separate, unresolved draft.

## 1. Direct status of open partner and acquisition threads

The connected Gmail search on Nov 8 found:
- Sent Nov 8 Carahsoft public-sector teaming inquiry remains without a verified reply. This is a **prospect, not partner or TEA incumbent**. Do not manufacture response, signed scope, liability/insurance or subcontract.
- Earlsneuk's Nov 7 builder correspondence remains the latest substantive builder reply. A Google Calendar meeting is confirmed **Tuesday Nov 10, 2026 10:00–10:30 a.m. Central**. The builder's statement of seven completed detached homes and fifteen undeveloped lots **does not** demonstrate current ownership, availability, title, location or site control.
- No fresh Dixie/Contempo broker reply, complete T12, rent roll or authorization has been received in reviewed Gmail. Multiple requests were already sent; avoid more same-day duplicates.
- Euna/Bonfire supplier registration has an **"Almost done: Complete your registration"** email. That indicates unfinished confirmation; no credential tokens should be copied into source. Finish using the owner's authenticated email/browser.
- No actual STANSHARES corporate resolution, cap table, signed shareholder rights instrument or legal exemption memo was found in reviewed records.
- Texas state vendor profile creation was owner-reported under LARRY SHELTON ESTATE; paid CMBL listing not confirmed. Vendor account, CMBL listing, TEA Bonfire access and specific contract award are separate milestones.

## 2. TEA RFO 701-26-015: route and time gates

**Proposed path: partner/subcontract — not standalone prime without independent qualification.** TEA's statutory Bond Transparency Database procurement requests school tax, bond election, project and public reporting services, not NOMNI, Bitcoin settlement, government digital securities or a central counterparty trust.

| Item | Date / status | Release requirement |
|---|---|---|
| Written solicitation Q&A | Nov 13, 2026 by 2:00 p.m. Central | Confirm current attachments/addenda; submit only using Euna/Bonfire Vendor Discussions |
| Proposal response | Dec 8, 2026 by 2:00 p.m. Central | Verified registered bid account, authorized signer, mandatory plan, insurance and delivery partner |
| Carahsoft inquiry | Sent Nov 8, 2026; no reply evidenced | Written partner interest, capture lead, permitted scope, funding and flow-down review |
| Insurance / security | Unverified | Review final TEA RFO's professional/cyber coverage, TX-RAMP responsibility, accessibility, VetHUB subcontracting plan and data privacy |
| Software demonstration | Synthetic bond-validation tests only | Actual data dictionary/agency-approved security testing; no live TEA data ingested |

Official TEA source: https://tea.texas.gov/taxonomy/contracts-and-purchasing  
Official ESBD listing search: https://www.txsmartbuy.gov/esbd  
Solicitation 701-26-015 procurement context: https://www.lightrfp.com/marketplace/bid/TX_SMARTBUY-701-26-015/bond-transparency-database  
Counterparty API reference: https://docs.counterparty.io/docs/advanced/api-v2/v1-to-v2/

**Price/control note:** Responding to a procurement cannot be used as investor solicitation for Orange Chips. Third-party commercial RFO price estimates are not award values. Preserve NEO underlying code/IP; the final TEA RFO and prime contract may grant broad work-product ownership, and any subcontract flow-down needs careful review.

### Prime partner diligence
1. Evidence that a potential prime **actually intends to bid** this RFO; Texas DIR prime status alone does not prove that.
2. Relevant secure statewide SaaS delivery history, insurance certificate, accepted TX-RAMP plan/level, staffing and SLA capability.
3. Specific NEO scope, deliverables, milestones, compensation, source-code/intellectual property rights, funding conditions and payment timing.
4. Data segregation, nonpublic information handling, subcontracting eligibility, confidentiality, VetHUB/HUB compliance and conflict/indemnity provisions.
5. Authorized signatures before proposal, logo use, agency representation or project financial commitments.

## 3. NOMNI — enhanced evidence interpretation

Previous connected read-only CounterPay balances confirmed *reported* public positions:
- Treasury \`18FyntJG9hdXYvanm67mGgbyo1P7adckvg\`: **166,414,131 NOMNI**.
- Original issuance address \`1NySA74g62Mr28Unp4uCxwtQv9FkD7AVpk\`: **101,898,388 NOMNI**.
- Orange Chip listing address \`1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8\`: **34 NOMNI**.

These sum to **268,312,553 units across ONLY the three observed addresses**, NOT total outstanding token supply. CounterPay metadata shows NOMNI indivisible, locked, original issuer at \`1NySA...\`, asset-owner at the Treasury address. Horizon Market separately publishes 900,000,000 supply and 837 holders. **Neither is independently regenerated issuance-history proof or a legal statement of private-key control.**

Official Counterparty API v2 supports:
- \`GET /v2/assets/NOMNI/issuances\` (issuance history)
- \`GET /v2/assets/NOMNI\` (asset metadata)
- \`GET /v2/events/ASSET_ISSUANCE\` (asset issuance event indexing)
- \`GET /v2/transactions/<tx_hash>\` (parsed transaction reference)
- Bitcoin confirmations must be checked independently with credible block data.

TokenScan independently documents \`GET /api/issuances/NOMNI\`. Direct issuance JSON retrieval was **not successful** in this run through web and sandbox internet; **no TXID has been invented**.

**New code:** \`server/neo-genius/issuance-history-proof.mjs\` reads externally supplied JSON pages using read-only endpoint provenance, detects invalid/duplicate issuance rows, traces tentative earliest issuance and lock events, and calculates a *tentative observed base-unit sum*. Its output deliberately leaves independently audited supply, Bitcoin confirmations, key control, lawful issuer/holder rights and GENIUS compliance as **false**. \`server/neo-genius/issuance-history-proof.test.mjs\` covers ten synthetic-data cases. Do not interpret any synthetic test TX hash as a NOMNI TXID.

### Required independent proof chain
1. Retrieve real mainnet Counterparty issuance history from an independently hosted node or a transparent two-source API capture, including **all pages** and pagination totals.
2. Capture the transaction TXIDs, block heights, source issuer, quantity, divisibility, any transfer or lock events and original event chronology.
3. Check each relevant Bitcoin transaction against an independently validated blockchain source; compare node heights and raw payload SHA-256 digests.
4. Independently verify any claim of issuer control by an authorized signed challenge (NEVER request seed phrase or private key).
5. Obtain signed current NOMNI rights documents and dated benchmark-agreement versions, then assess any currency, stablecoin, debt, securities or other classification **separately**.

## 4. Orange Chips — STANSHARES / KNOWINDEX

Live wallet-data reader observed **STANSHARES 1,000** and **KNOWINDEX 1,000** in one Orange Chip listing wallet. Both are indivisible but issuance unlocked. Thus 1,000 held units do NOT imply no further authorized supply, legally issued company shares or current capitalization.

**Mandatory protections before capital formation:**
- Actual issuer good standing, owner/board authority and signed share/instrument creation approvals.
- Date-controlled and signed capitalization table; number of authorized, issued, treasury, reserved and outstanding shares reconciled to legally valid rights and blockchain supply.
- Asset first-issuance and subsequent supply/owner/lock TXIDs with Bitcoin confirmations.
- Formal economic, governance, transfer, redemption and dilution rights in the legal issuer's signed books.
- Qualified legal analysis of security status and registration/exemption plus applicable broker, offering portal and transfer-agent/ATS controls.
- Marketing controls: no publicly advertised returns, reserves, guaranteed treasury profit, government purchases or crypto penny-stock secondary liquidity without evidence and authorization.
- Central Counterparty Trust is currently an escrow/risk-governance *concept*, NOT a registered clearing agency or guarantee fund.
- NOMNI historical benchmarking predating market terminology is archival evidence; existing issue age or terminology cannot override applicable law.

## 5. NEO Houses meeting package

For Nov 10 Earlsneuk:
- Request exact owner-approved schedule for seven complete houses and fifteen proposed lots: property identifiers, addresses, ownership/authority, status, pricing basis, zoning, flood, utilities, liens and completion status.
- Obtain written clarification of reported "low $300Ks" and whether it refers to **per completed home**, lot, or projected sale price.
- Compare three structures independently: completed-home inventory acquisition, conditional land/lot option plus fixed-price construction, or an owner/developer JV.
- Each route requires signed site control, T12/realizable cash flow as applicable, cost estimates, insurance, title, financing and compliant build-to-own beneficiary documents. No assumed income from tokens or grants.

The Houston HOME program's Nov 9 at 5 p.m. Central deadline remains imminent at time of gate; no eligible package or site-control evidence has been found. Do not file an inaccurate application.

## 6. Release decisions

| Workstream | Decision |
|---|---|
| Nonbinding prime-partner qualification | Proceed; await actual Carahsoft reply; no instant duplicate outreach |
| TEA solicitation formal response | HOLD until Euna account, prime partner or real prime team, insurance, VetHUB/security and sign-off |
| Developer meeting / inventory request | Proceed at scheduled time; no purchase or JV without title |
| Broker follow-ups | Hold duplicates pending received documents |
| NOMNI/World Currency original issuance certification | HOLD pending direct mainnet TXIDs, blocks and issuer-rights proof |
| STANSHARES/KNOWINDEX equity solicitation, transfers, markets | HOLD pending actual signed issuer and securities controls |
| Internal issuance parser and tests | Allow draft engineering review and CI; no deployment |

**Next gate NEO-GENIUS-010:** independently reproduced NOMNI genesis/lock TXIDs, first legal Orange Chip issuer document pack, partner decision on TEA and signed owner-approved NEO Houses parcel schedule. No fabricated certainty.
