# NEO-GENIUS-003 — Government Bitcoin Reserve Observer and Governed Capital Formation

**As of:** 2026-11-08. **Status: DRAFT / NOT DEPLOYED / NOT AUDITED.** This is not a government award, an approved stablecoin, a securities offering or authority to control public funds. Read with the earlier `docs/compliance/NEO-GENIUS-002.md` in draft PR #1356.

## Core rule
A government vendor registration is a bidding channel, **not** permission for governments to buy any asset a vendor issues. Texas reserve cryptocurrency purchases are subject to Tex. Gov't Code §403.704 ($500 billion average market cap over preceding 24 months); most local-government funds have separate restrictions under Tex. Gov't Code Chapter 2256. The July 2026 Texas Bitcoin Reserve custody/liquidity RFP has closed. Vendor qualifications and contracting authority must be verified; no government sales, custody or authorizations are claimed.

## Product lanes

1. **NEO eGaaS Government Reserve Observer — first commercial wedge.** Provide watch-only Bitcoin reserve reporting, transaction proof references, approved custody-statement reconciliation, risk notes and separate public and authenticated government views. No private keys and no reserve trade execution. Agency procurement, cybersecurity/TX-RAMP scope and privacy/security contract obligations remain outstanding.
2. **NEO Houses Build-to-Own — separate municipal/private project SPV.** Combine only verified land/title, approvals, sponsor resources, legally eligible housing programs, third-party financing and permitted equity capital. Keep grants, wage obligations, beneficiary sweat-equity credits, debt and investor ownership separate in the books. Require realistic acquisition/build-out projections, appraisals, insurance, property taxes, construction and housing protections. Neither returns nor purchase rights are guaranteed. Do not treat proposed ownership credits as substitute for wages, title or loan documentation.
3. **World Credits / NOMNI — classify individually before marketing.** NOMNI source code says **'Market-observed value, not a guaranteed redemption peg.'** The claimed 900M indivisible locked supply, issuer `1NySA74g62Mr28Unp4uCxwtQv9FkD7AVpk`, Treasury `18FyntJG9hdXYvanm67mGgbyo1P7adckvg`, and historical stable benchmark agreements need independent Counterparty transaction/block records and dated legal documentation. Asset age or preferred terminology does not exempt fixed-dollar redemption obligations from payment-stablecoin law. GENIUS/OCC effective 2027-01-18.
4. **Orange Chips and new ventures — documented issuer securities.** Establish proper company entity, voting/economic rights, beneficial ownership, capitalization records, applicable securities registration/exemption, intermediary or trading-venue arrangements, audited disclosures as relevant, settlement controls, and transfer restrictions. Counterparty tokens alone do **not** create equity rights, cure unregistered securities offerings, or support unrestricted penny-stock trading. SEC Sept 2026 temporary innovation exemption is *conditional and limited* to specified tokenized NMS stock trading—not all private or microcap securities. Reg CF uses SEC-registered intermediary and up to $5M of eligible issuer fundraising over a rolling 12 months, under its restrictions.
5. **Central Counterparty Trust — governance concept only.** An internal escrow, double-entry reconciliation, segregation and risk-control framework may be developed, but NEO is not demonstrated to be an SEC-registered clearing agency/CCP. An entity interposing as buyer to every seller and vice versa for securities clearing generally requires SEC registration or exemption (Exchange Act §17A). Bitcoin atomic delivery may mitigate delivery risk but does not eliminate issuer default, legal-title, custody, smart-contract, operational or market risks.

## Prototype shipped in this branch
- `server/neo-genius/readonly-reserve.mjs`: Watch-only reports. Exact integer satoshis; mandatory provenance; block-height mismatch warning; price only as *indicative, unattested*, never from fallback/fixtures; custody variance not erased; reject key/secret fields; all certification values remain false.
- `collectCounterpartyObservation('NOMNI')` calls fixed official Counterparty v2 GET endpoints for asset details and issuance history, preserves timestamp and response SHA-256 fingerprint. **API observation does not equal independent node attestation.** Failed endpoint returns explicit error, not fabricated token data. No network calls occur in the tests.
- `server/neo-genius/readonly-reserve.test.mjs`: Nine local tests were run successfully before creating this draft branch.

Run tests:
```bash
node --test server/neo-genius/readonly-reserve.test.mjs
```
The mainnet API could not be reached from the sandbox used to prepare the prototype; the public asset explorer exposed no current machine-readable supply/issuer/lock records. **No independent NOMNI attestation has been completed.**

## Hard acceptance gates
- [ ] Independent Counterparty node / issuance tx + block confirmation and source timestamp; reconcile NOMNI/NMNI naming, supply and issuer/treasury control.
- [ ] Dated agreements for historical NOMNI benchmark and precise economic/redemption rights; legal classification for each instrument.
- [ ] Government-approved Bitcoin public address/custodian report pilot and a *separate* independently corroborated proof of holdings, without private key access.
- [ ] Contract/legal cybersecurity requirements, vendor registration and tax/good-standing evidence independently verified for Shelton Estate & Co.
- [ ] One nonbinding agency capability statement with independently supported performance claims.
- [ ] NEO Houses underwriting with a verified site, entity/SPV, housing program legal analysis and uncircular sources-and-uses.
- [ ] Orange Chip issuer, capitalization documentation, appropriate securities counsel/intermediary and market permissions before any offering, trading, pooling or capital solicitation.

## Official references
- Texas reserve statute: https://statutes.capitol.texas.gov/docs/GV/htm/GV.403.htm
- Public Funds Investment Act: https://statutes.capitol.texas.gov/docs/GV/htm/GV.2256.htm
- CMBL: https://comptroller.texas.gov/purchasing/vendor/cmbl/
- Texas closed reserve RFP: https://www.txsmartbuy.gov/esbd/908-26-1778WS
- OCC GENIUS Act final rule: https://www.occ.gov/news-issuances/bulletins/2026/bulletin-2026-50.html
- SEC on tokenized securities: https://www.sec.gov/newsroom/speeches-statements/corp-fin-statement-tokenized-securities-012826-statement-tokenized-securities
- SEC tokenized NMS stock exemption: https://www.sec.gov/newsroom/press-releases/2026-90-sec-issues-innovation-exemption-facilitate-trading-tokenized-nms-stock-request-comment
- SEC crowdfunding: https://www.sec.gov/resources-small-businesses/exempt-offerings/regulation-crowdfunding
- SEC clearing agencies: https://www.sec.gov/about/divisions-offices/division-trading-markets/clearing-agencies
- Counterparty v2: https://docs.counterparty.io/docs/advanced/api-v2/v1-to-v2/

**Release:** Allow internal prototype, documentation and authorized read-only technical research. Hold assertions of independently audited token reserves, live public-fund transactions, regulated investment products, government endorsements, live clearing/marketmaking, and offers of securities pending counsel, approvals and evidence.
