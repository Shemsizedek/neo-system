# NEO-GENIUS-006 — Financial Evidence, STANSHARES Authorization & Government Transparency Pilot
**Reviewed:** November 8, 2026 (Central time)  
**Status:** EVIDENCE REVIEW / NOT AN ACQUISITION, SECURITIES OFFERING, GRANT APPLICATION, LICENSE, OR GOVERNMENT CONTRACT  
**Dependencies:** draft PR #1357 (read-only reserve observer), draft PR #1359 (candidate qualification). This gate adds corroboration, seller mathematics and bid/no-bid triage. It does not authorize live issuance, fundraising, agency contracts, or purchase commitments.

## Gate decision summary

| Lane | Evidence seen | Unresolved required evidence | Decision |
|---|---|---|---|
| Dixie Drive (20 units) | Public asks $1,750,000; 7%-8% cap claims across listings; multiple broker inquiries in sent mail | Broker reply, listing authority, rent roll, trailing-12, tax, insurance, flood, survey, title, financing | Seller follow-up only after reasonable response interval; no additional duplicate outreach |
| Contempo (20 units) | Old advertised NOI $169,843, earlier price $2,775,000, historic 6.12% cap; more recent $2,749,000 public offer; multiple previous requests | Updated offering memo, actual T12/collections, seller authority, price/cap reconciliation, title, rehab and flood | Hold before LOI |
| Oxford (25 units) | Public listing quote ~$1.85M and 8.65% cap, conflicting marketing data; reported Zone AE exposure from secondary listing | Current authorized broker, source dates, verified FEMA/insurance, T12, rent roll and physical inspection | Hold / flood underwriting |
| Earlsneuk housing | Email reports 7 finished homes plus 15 undeveloped lots; video meeting on Tue Nov 10 at 10 a.m. Central | Actual parcel map, developer owner authority, available inventory, *what* 'low $300Ks' describes, bids, construction specs | Meeting is opportunity qualification only; no site control or purchase |
| STANSHARES | User project identifier; no verified legal issuer documentation or on-chain tx in reviewed repo/email | Company formation, owner authorization, cap table, share terms, issuance ID, securities counsel/intermediary | **NO securities issuance / promotion / trading** |
| NOMNI | Project repo describes locked 900,000,000 indivisible units; independent Horizon Market *web page* displays supply 900,000,000, locked, 837 holders (snapshot 2026-11-08). | Direct Counterparty node/API issuance TX+block, issuer ownership, on-chain reserve/custody evidence if any, legal redemption obligations | Upgraded to two-publisher corroboration, **not independently chain attested** |
| State procurement | Operator email says state vendor account **LARRY SHELTON ESTATE** created; all 25 districts and five classifications added; $70 paid CMBL activation pending | Actual state portal status, payment receipt, formal CMBL vendor listing, entity good standing, necessary NIGP/security/insurance | Can research/listen/respond according to solicitation; **do not claim active paid CMBL listing** |
| Government demo | PR #1357 has draft noncustodial reserve observer and tests | independent Bitcoin source provenance, custodian authorization, independent reconciliation, cybersecurity validation, specific agency pilot scope | Internal read-only prototype only |

## Seller-claim arithmetic — NEVER replace a T12 with an implied NOI

- **Dixie**: Asking $1,750,000 * 8.00% advertised capitalization rate implies $140,000 annual NOI; at 7.00% it implies $122,500. The $17,500 discrepancy must be explained with broker-signed figures. Do not claim that NOI declined simply because differing listings publish cap values.
- **Contempo**: Old $2,775,000 ask * 6.12% cap mathematically implies $169,830 NOI; older offering paperwork reportedly uses $169,843 (difference $13). A later advertised ask of $2,749,000 is not sufficient proof of a seller-authorized price reduction. Do not apply old NOI to the latest price without a fresh T12 and date normalization.
- **Oxford**: Conflicting rates, prices, vacancy and flood information prohibit an underwritten cap rate until reconciled.
- These are *calculations from marketing inputs*, not operating statements, bank deposits or a certified appraisal.

`server/neo-genius/evidence-reconciliation.mjs` implements exact integer/basis-point implications, explicitly labels marketing claims, detects discrepancies and never fabricates underwriting approval. Its tests are included in `npm test` from the parent gate branch.

## NOMNI evidence statement — observation versus independent attestation

**Operator source (internal)**: `server/neo-edge/server.mjs` source states fixed supply 900,000,000; indivisible and locked; issuer and treasury addresses. It explicitly describes valuation as **market-observed, not a guaranteed redemption peg**.

**Second publisher:** https://horizon.market/assets/NOMNI (viewed 2026-11-08). It displays non-divisible, locked, supply 900,000,000, holder count 837, and 'Price unavailable' / unavailable market capitalization. Dispenser asking prices are not proof of a liquid two-sided market, guarantees or auditable NAV.

**Explorer gap:** https://tokenscan.io/asset/NOMNI loads a shell but machine-readable public text did not expose issuer/supply/issuance history. Official Counterparty v2 GET endpoints for /assets/NOMNI and /assets/NOMNI/issuances documented at https://docs.counterparty.io/docs/advanced/api-v2/v1-to-v2/ were not directly retrievable in this session.

**Permitted language:** 'Two published sources agree on the reported NOMNI asset supply and lock flag.' **Not permitted:** 'NOMNI is independently audited', 'GENIUS-compliant stablecoin', 'government reserve eligible', 'cash backed', 'guaranteed liquidity', or 'holder credit is legal tender'.

## Houston HOME NOFA decision
Houston HCD officially lists open **NOFA-2026-0006**, approximately $12M in HOME affordable multifamily funds, applications due **Monday November 9, 2026 5:00 p.m. CST**. Official: https://houstontx.gov/housing/funding.html . No verified site control, experienced development sponsor commitment, affordabilty underwriting or complete grant application has been established for any candidate. **Do not submit** unsupported application or convey grant preapproval; preserve information for later funding cycles/partnerships. Preliminary listings alone do not establish eligibility.

## NEO Houses × Earlsneuk verified conversation and meeting
The November 7 developer emails confirm these as **developer reported**, not signed/verified:
- Builder usually works inner city, can consider two-to-four-home pilot subject to fit.
- Seven finished houses and 15 undeveloped lots in one reported community; neighborhood, parcel numbers, availability and owner authority absent.
- Low-$300K price description is ambiguous (per home vs other basis).
- Fixed-price contracts possible; estimate preparation approximately one month; design+permitting commonly about 4–6 months, contingent on drawings and circumstances.
- Tuesday November 10, 2026 10:00–10:30 a.m. Central Google Calendar event exists.
Meeting must resolve owner/developer legal party, parcel/title authority, inventory and sitework, design/spec basis, financing and lender requirements, bond/insurance/warranty, stage payments and whether affordable housing program eligibility is feasible. **No bond, construction award, ownership, investment guarantee or exclusive purchase rights are claimed.**

## First Orange Chip: STANSHARES
- User concept identifies James A. Stanback Inc. and STANSHARES; no verified signed company authority/cap table or issuance proof found in the repository search/Gmail as of this review.
- Must request signed authorized-officer consent, entity good standing, governing documents, resolutions specifying equity class, subscription and transfer agreements, share certificates/registrar, capitalization and controlling-party identities.
- Verify the precise Counterparty asset ID, issuer and supply/transaction block independently rather than assuming token existence from a name.
- A qualified securities lawyer must classify proposed issuer shares and select an applicable registration/exemption, selling intermediary and compliant transfer restrictions.
- **Central Counterparty Trust:** internal contractual escrow and reconciliation concept only; no registered central-counterparty/clearinghouse claim. Public investor money or securities cannot flow until all authorities and protections exist.

## Government eGaaS — stronger near-term software procurement lead

### Texas Education Agency RFO 701-26-015: Bond Transparency Database
**Preliminary public posting intelligence — full buyer RFO and amendments must be obtained before an actual bid/no-bid decision.**
- Posted Nov 5, 2026; questions reported due **Nov 13, 2026 2:00 p.m. Central**; responses **Dec 8, 2026 2:00 p.m. Central**.
- Scope: statewide bond, tax and capital-project data aggregation/public reporting for about 1,208 Texas school districts and charters; secure uploads, validation, public search/mapping and accessibility, agency integration, support and audits.
- Five-year duration; **third-party listing indicates estimated value $7.5m**, which is **not a verified award or available guaranteed revenue**.
- Summary reports mandatory subcontracting plan/VetHUB, TX-RAMP and ADA/accessibility, 99.9% uptime and 30/60/120-day implementation milestones. All terms require independent confirmation from official RFO and attachments.
- Procurement is for **public data infrastructure, not asset issuance, Bitcoin investment, or government purchase of NOMNI**. Do not add unrequested blockchain requirements; propose optional auditable records only if the agency approves.
- Existing email (sent Nov 8) asks UH APEX for intake and help with this specific RFO; avoid duplicate outreach while awaiting reply.
- Begin **subcontractor/consortium qualification** concurrently with prime-bid feasibility. With no approved TX-RAMP and no evidenced staffing/agency deployment history, a solo prime bid is higher execution risk.
- Secondary public sources (not substitutes for official bid docs): https://www.lightrfp.com/marketplace/bid/TX_SMARTBUY-701-26-015/bond-transparency-database ; https://publicbidsearch.com/bids/bond-transparency-database-tx-839c80 .
- Official vendor registration: https://comptroller.texas.gov/purchasing/vendor/registration/ ($70 CMBL annual fee, as opposed to mere vendor profile creation).

### Read-only reserve proof demo
Keep the other eGaaS pilot as **noncustodial** and explicitly **not state reserve holdings**. No keys, governmental control, real transfers or implied agency affiliation. Independent Bitcoin full node/block provenance, authenticated custodian data, simulated variance/integrity tests and reviewer signatures are required before public certification.

## Release authority and evidence status
- **ALLOW:** documented title and financial request/review, meeting preparation, market-source reconciliation, read-only technical prototype and nonbinding vendor capability exploration.
- **HOLD:** HOME application with unsupported assertions; acquisition or LOI claiming funds not secured; orange-share issuance/secondary market/clearing; public custody, regulated stablecoin claims; eGaaS government certification; binding state RFO bid unless full RFO and qualified entity/team reviewed.
- **NO new broker sends:** prior recent outreach to Dixie and Contempo is already multiple emails. Recheck for responses and reconcile them before additional messages.
