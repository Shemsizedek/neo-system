# NEO-FLIP-003 — Buyer-First Wholesale Gate

**Operator:** Shelton Estate & Co. (legal payee, authorized agents/signers and receiving details pending verification).
**Coordinator:** NIA-013 NEO Deal Desk.
**Status:** draft PR only; no production merge or deployed integration.

## Purpose
Prioritize legitimate cash-buyer acquisition criteria before negotiating aged Houston listings. Separate evidence from assumptions. A buyer's stated maximum is not a signed promise, a listing's age is not seller consent, an ARV estimate is not an appraisal, and an indicated assignment fee is not revenue.

## Workflow
1. **Permissioned source.** Import only from a commercially authorized and independently verified listing feed, verified owner submission, or a permitted public record. For agent intake require fresh active-status evidence (72 hours), a Texas property, 120+ DOM and source timestamps. HAR links in research notes are **not** a licensed machine-feed authorization.
2. **Buyer opt-in.** Validate buyer identity, lawful property-offer opt-in scope, consent timestamp, suppression, permitted contact channel, recent independently confirmed buying capacity, market and asset-specific buy box. Store real names, contact details, proof of funds and contact tokens only in a properly access-controlled vault; project only opaque buyer ID and verification references.
3. **Sold comparables.** Require at least three independently verified closed sales with valuation-use rights. Default 365-day age, 2-mile proximity and within 35% living-area variance; require adjustment evidence and cap automatic adjustment magnitude at 15%. These are screening defaults subject to market and professional valuation review, not a certified appraisal.
4. **Buyer-first pricing.** Use conservative comparable-based ARV and subtract repairs, closing, holding/selling, contingency and the buyer's minimum margin. Cap the result at the verified buyer all-in maximum; subtract target assignment fee to calculate the maximum modeled seller price. All cost assumptions require evidence.
5. **Inquiry.** Prepare an explicitly non-binding availability inquiry from Shelton Estate & Co. as a *prospective principal purchaser*. Do not imply contractual ownership. No automatic sending in this gate; verify legal entity, representation authority and lawful contact route, and apply applicable outreach laws and opt-outs before any future send.
6. **Deal Desk.** `toBuyerFirstDealDeskRecord` emits a minimally necessary review shape, with `quote.ask=null`, `recognizedRevenueUsd=0`, explicit approval blockers, and no personal buyer email or contact token. No CRM write has been implemented.
7. **Human/legal gate.** Confirm actual contract assignability, interest rights, disclosure forms, agreement terms, deposit obligations and any licensing/brokerage restrictions before binding commitments. External e-signatures, escrow, and real receipt confirmation are separate authenticated provider gates.

## Controls
- Source permission claims and buyer proof flags are **untrusted data** until an independent authenticated provider validates them. Do not rely on a simple user-supplied boolean in production.
- No bulk marketing, scraping restricted platforms, bypassing MLS data contracts, use of bought contact credits, or personal-contact enrichment by default.
- No guaranteed spread, no fictitious seller discounts, and no phantom buyer demand.
- **Inbound fees:** NEO agents do not initiate outgoing payments. The verified legal beneficiary can receive proceeds directly through title/escrow under signed instructions, with independent receipt reconciliation. No release or sending of wire instructions from a public repo or an untrusted email.
- No production deployment, legally binding offers, signatures or money movement in this gate.

## Test and next step
`node --test server/neo-flipper/core.test.mjs server/neo-flipper/stale-listing.test.mjs server/neo-flipper/buyer-first.test.mjs`

**Next gate:** provider-backed source authorizations, buyer registry with verified consent, comparable-sales import and read-only protected Deal Desk staging adapter. Then separate counsel, signer and escrow staging tests.

Source citations:
- https://www.trec.texas.gov/agency-information/rules-and-laws/trec-rules
- https://statutes.capitol.texas.gov/Docs/PR/htm/PR.5.htm#5.0205
- https://www.har.com/content/mls-rules-and-regulations
