# NEO-HOUSES-TX-010 / NCC-016 — Property Manager Administrative Acquisition Integration

**Status:** Draft PR #1406 (development-only). No deployed agent or property control.

## Mission and product surface
NEO Property Manager is a separately offered administrative/property-management product underneath:
- **NEO Pads**: authorized housing operations, resident requests, inspections, maintenance.
- **NEO Realty**: deed/title source references, deal sourcing, owner-authorized offers and closing.
- **Smart Realty**: property telemetry, equipment/service events and maintenance chain.
- **NEO Deal Desk**: distressed opportunities, underwriting, counterparty qualification and approval.
- **NEO Crown Chain**: private evidence hashes, CES journal links and independent Bitcoin publication commitments.
- **Government interfaces**: official source references to recorded deed IDs, public code/permit/assessor information, and verifiable APIs. No displacement of statutory public recording offices.

## Current target — Algerian Way (source-qualified only)
- HCAD accounts **0772210030001** (2502 Algerian Way) and **0772210020011** (2504 Algerian Way).
- Both listed in HCAD 2026 under 2502 Algerian Way LLC, effective June 24, 2026.
- Await authenticated June 2026 county deeds, recorded final replat, occupancy/permit/code history, and authorized party contact.
- The City of Houston PIA request W346601-110926 is acknowledged; until responsive records arrive, **NO municipal abandonment or declared vacancy finding is established**.
- No current possession, manager appointment or title interest of NEO Property Manager is demonstrated.

## Historic Canvasback-derived method — documents, NOT automated legal effects
Source: client-provided 25-page civil exhibit reproduction **78266927.PDF**. The private source file is **NOT stored in this public repository**.

Elements the historical document illustrates:
1. Identify deed/legal description, claimant, and consideration or mutual-credit notation.
2. Prepare a dated factual statement and evidence chronology.
3. Distinguish notarial acknowledgment and county recording from an owner-executed transfer.
4. Address each intended recipient and capture actual delivery/receipt evidence.
5. Keep notice of nonresponse as a source assertion, never as consent.
6. Authenticate official code records separately from private utility/realtor vacancy observations.
7. Preserve property condition photos and source timestamps.
8. Link CES ledger posting and Bitcoin/Counterparty broadcast as independent events, without requiring a token transfer.
9. Link only verified title, manager authority, court order and financing instruments to active property operations.

## Acquisition routes (all enabled for screening)
Unsolicited owner proposal; negotiated LLC membership-interest transfer; genuine distressed debt acquisition; official tax/foreclosure auction; redevelopment JV or ground lease; signed third-party property-management mandate; **adverse-possession fact review** where actual, visible, continuous hostile possession over the applicable period may be documented.

A hostile commercial offer is permitted as strategy; a property takeover is not authority for entry, eviction, lock changes, self-created lien, or unilateral deed registration. Vacancy and nonresponse do not transfer title.

## NCC-016 implementation acceptance
- `server/neo-property-manager/acquisition-administration.mjs` classifies source records, distress indicators, transaction routes, and legal-effect boundaries.
- `tests/neo-property-manager/acquisition-administration.test.mjs` rejects silent-consent, vacancy-title, and automatic adverse-possession claims and asserts product integrations.
- All actual source documents remain private, with only opaque hashes or approved redactions later published.
- Actual authority/license/consent verification, government API feeds, transactions and external messaging require separate approval and production verification.
- Do not merge PR #1406 without validating CI against the actual NCC-015 module and performing security/privacy review.

## Governing official sources
- Texas CPRC Ch.16: https://statutes.capitol.texas.gov/Docs/CP/htm/CP.16.htm
- Texas Civil Practice & Remedies Code Ch.12 fraudulent liens: https://tcss.legis.texas.gov/resources/CP/htm/CP.12.htm
- TREC property management: https://www.trec.texas.gov/q-does-property-manager-have-be-licensed
- Texas LLC membership distinction: https://tcss.legis.texas.gov/resources/BO/htm/BO.101.htm
