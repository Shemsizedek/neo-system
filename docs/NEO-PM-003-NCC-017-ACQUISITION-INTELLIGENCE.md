# NEO-HOUSES-TX-011 / NCC-017 — Property Acquisition Intelligence and Incident Evidence

**Status: Draft; no production deployment, filings, property entry or automatic owner-service.**
This module extends NCC-015 and NCC-016 in draft PR #1406 without altering the production Deal Desk, NEO Pads, NEO Realty or Smart Realty.

## Scope

NEO Property Manager is a background records and operations service for:
- **NEO Pads:** authorized occupancy / maintenance coordination.
- **NEO Realty:** title-record diligence, offers, broker/seller authority.
- **Smart Realty:** service tickets, inspections and building equipment history.
- **Deal Desk:** source-backed distressed acquisition screening and deal approval.
- **NEO Crown Chain:** hashes of private evidence, separate CES accounting and Bitcoin broadcasts.
- **Government/public-sector connectors:** read-only deed identifiers, appraisal records, public-code inspections, recorded maps and tax-auction references; statutory recording stays with the responsible authority.

## Source handling
Source evidence classes include official city/code and court records, deeds, plats, tax records, lender notices, photographs, reported incidents, and observations. A claimed official origin is **not proof of official authentication**. `intakeSource` marks each unverified item as `NOT_ASSESSED` for independent corroboration, and does not grant possession or establish legal service.

A claimant may describe photographs as showing damage discovered after an alleged removal; this must be stored in a **restricted private record** without software concluding who caused damage or whether a removal was unlawful. Do not publish names, accusations, photographs, resident records, health information or case exhibits in GitHub or public blockchain payloads.

## Algerian Way status (public records, Nov 10 2026)
- HCAD accounts 0772210030001 (2502 Algerian Way) and 0772210020011 (2504 Algerian Way) identify 2502 Algerian Way LLC as listed owner, effective 2026-06-24.
- A July 2026 Gretna Courts Partial Replat No. 3 planning application shows redevelopment activity in third-party reporting. Find original planning record and actual county-recorded plat separately.
- City of Houston PIA W346601-110926 is acknowledged; **no released official city finding of abandonment, condemnation, current code violation, or municipal acquisition authorization has been authenticated** for either property.
- The certified June 2026 deeds, tax delinquency, lien status, encumbrances, survey, occupancy, and corporate authority remain transaction-specific verification items.
- Screening includes unsolicited bids, permitted distressed-debt acquisitions, public auction, entity-interest purchase, joint ventures and adverse-possession historical-fact review, each routed to required authorization and evidence checks.

## Acquisition discipline
- A claimant cannot start a recognized adverse-possession period merely by filing notice, changing locks, mowing grass or using a public blockchain broadcast.
- Do not enter, occupy, secure, lock, move belongings, cut utilities, threaten occupants, publish accusatory claims, or create conflicting ownership records without actual legal authority.
- Third-party property management starts only with appropriate control, signed appointment and approval. For regulated paid leasing/rent functions, verify licensing/exemptions.
- Source documentation and legal-effect adjudication remain separate even after a public proof hash is published.

## Evidence schema
- `distress-and-incident-intake.mjs`: restricted source register, private source commitments, cautious distress review, management activation gates.
- `tests/neo-property-manager/distress-and-incident-intake.test.mjs`: six synthetic tests, to be run with existing NCC-015/016 suites by CI.
- All original bytes are stored in a permissioned vault later; this module stores only source identifiers and hashes, with no direct external calls.

## Next acceptance
1. Match official deed records to owner authority and controlling corporate entities;
2. Verify original city records and true tax/foreclosure status with source authentication, not a claimant flag;
3. Add role-based access, private evidence vault, retention rules and full audit trail;
4. Run combined NCC-015/016/017 CI and threat model before merge;
5. Demonstrate one read-only government-record adapter and one synthetic maintenance work order with explicit signed mandate;
6. Verify independent CES / Bitcoin linked references without claiming that published tokens convey real estate;
7. Human review for outside notices, title filings, mortgage servicing, investor offering, property entry and any execution.

## Sources
- Texas CPRC §16.021: https://statutes.capitol.texas.gov/Docs/CP/htm/CP.16.htm
- TREC property-management licensing: https://www.trec.texas.gov/q-does-property-manager-have-be-licensed
- Harris County property-tax delinquency: https://www.hctax.net/Property/DelinquentTax
- Houston City Council dangerous-building records overview: https://www.houstontx.gov/council/committees/rna/20230214/dangerous-buildings.pdf
