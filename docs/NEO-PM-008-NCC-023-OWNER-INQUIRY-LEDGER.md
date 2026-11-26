# NEO-HOUSES-TX-017 / NCC-023 — Parcel-specific outreach and restricted Crown administrative ledger

**Status:** development branch / draft PR #1406. No ownership or legal notice filing, property entry, payment, lien, signed manager contract, or mainnet publication.

## Purpose
Support the NEO Deal Desk, NEO Realty, NEO Pads and Smart Realty with individualized acquisition outreach evidence; preserve original dates and source hashes without confusing notices with property rights.

## Two target public parcel leads
- Case ALG-2502: 2502 Algerian Way, HCAD 0772210030001, HCAD-listed owner 2502 Algerian Way LLC.
- Case ALG-2504: 2504 Algerian Way, HCAD 0772210020011, HCAD-listed owner 2502 Algerian Way LLC.
- HCAD source documents arrived Nov 10, 2026. The county deeds, actual authorized company signatory, recorded final Gretna Courts replat and the City PIA W346601-110926 response are not verified.
- Nov 6, 2026 is the documented investigation/correspondence origin. Nine public-record and initial business contact emails were sent that day. NONE is proven as service of an owner-directed legal adverse possession notice.

## Source-specific administrative process
1. Open a separate asset/case record with HCAD account and historical source reference; no inferred legal title.
2. Prepare a **nonbinding** property-specific acquisition or redevelopment inquiry with populated owner-company, address and case reference. No placeholders or fabricated recipient contacts.
3. Stage the letter digest as restricted Crown event. Draft state is DRAFT_UNSENT.
4. Verify actual recipient, lawful contact, corporate authority and dispatch method independently before transmission. A provider ID, postal receipt and a reply are separately attached evidence fields.
5. If actually sent, update the communication record with authentic dispatch timestamp and proof. This module does not certify legal service, owner consent, statutory possession, or a default.
6. Accept city inspection, tax, registered deed, foreclosure or plat records by their original sources and content; source-type classification cannot establish abandonment or foreclosure by itself.
7. Offer nonbinding corporate purchase, JV, ground lease, qualified debt and adverse-possession fact review as separate Deal Desk branches; any actual possessory interest requires physical facts and applicable legal process.

## Implementation
- `server/neo-property-manager/owner-inquiry-ledger.mjs`: create two parcel-specific communication drafts, hash into existing restricted evidence envelope, separate dispatch reports from legal effect, classify official distress leads.
- `tests/neo-property-manager/owner-inquiry-ledger.test.mjs`: six synthetic tests including distinct parcel hashes, strict unsent status, nonresponse-not-consent, no auto possession, and fail-closed invalid data.
- No live communication was sent by the new module and no signed owner notice was made or filed.

## Public financial and official record caveats
- Harris County 2026 tax due date is Jan 31, 2027, so a current unpaid 2026 assessment is not automatically delinquent.
- Ownership authority must be independently established; a registered agent or public business-development mailbox need not be a signatory or owner.
- Adverse possession under Texas CPRC §16.021 depends on qualifying actual and visible appropriation, not the NEO intake timestamp.

## Delivery acceptance
- The unmerged PR must pass the dedicated Node synthetic suites and general CI.
- The completed private DOCX inquiries and updated workbook remain outside GitHub, with no private case images, bank data, nonpublic emails, or original HCAD PDFs committed.
- Production requires NEOpass reviewer enrollment, private audit vault, legal authority and explicit approval for each external filing/notice, property entry or mainnet broadcast.

## Government records
- https://cclerk.hctx.net/Applications/WebSearch/RP.aspx
- https://www.hctax.net/Property/ViewStatementReceipts
- https://comptroller.texas.gov/taxes/franchise/account-status/search
- https://statutes.capitol.texas.gov/Docs/CP/htm/CP.16.htm