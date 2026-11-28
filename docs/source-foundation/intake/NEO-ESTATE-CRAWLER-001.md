# NEO-ESTATE-CRAWLER-001 — Estate opportunity intelligence (read-only pilot)

**Operator:** Shelton Estate & Co. · **Parent:** Existing NEO Market Agent · **Status:** Isolated, offline-only candidate generator; **NOT** live county-data ingestion, a production integration, or authorization to contact anyone.

## Scope and official inputs
- Harris Central Appraisal District (HCAD) provides large downloadable **tab-separated** property datasets intended for import: https://hcad.org/hcad-online-services/pdata/ . They indicate property characteristics and **appraised value**, not listing prices or estate-sale availability. Review HCAD's published codebook before live import: https://hcad.org/hcad-online-services/pdata/pdata-help/ .
- Harris County Clerk probate case search: https://cclerk.hctx.net/applications/websearch/CourtSearch.aspx?CaseType=Probate . The Clerk advertises a separate **bulk data/FTP access inquiry** through its Data Sales desk. Do not automate courthouse search pages or presume API/bulk permission.
- Real-property recording index: https://cclerk.hctx.net/applications/websearch/RP.aspx/RP.aspx . An index is not complete title confirmation.
- Texas Estates Code Chapter 202 (heirship) and Chapter 455 (public probate administrator): https://tcss.legis.texas.gov/resources/ES/htm/ES.202.htm and https://tcss.legis.texas.gov/resources/ES/htm/ES.455.htm . A probate filing is **not** proof of no heirs, unclaimed property or sale authority.

## Components
1. **server/neo-crawler/estate-sourcing.mjs:** streams local HCAD-style TSV and **separately authorized, curated CSV** case-to-parcel links; exact account-ID matching, deduplication, SHA-256 provenance, research-only output without owner names. Exports an opt-in adapter for the existing NEO Crawler; no default registration or network calls.
2. **scripts/neo-estate-pilot.mjs:** writes creation-only local JSON using 0600 file permissions. No network, cron, contact, transaction or database connector.
3. **server/neo-crawler/estate-sourcing.test.mjs:** eight synthetic-only tests. No real owners or cases are committed.

## Source format and local test
HCAD input is tab-delimited with supported column aliases: acct, site_addr_1, state_class, tot_appr_val. Inspect the real file layout before use. The separately licensed/curated case link CSV requires columns:

    parcel_account,case_number,court_record_url,filed_date

Fictional sample only:

    000100,PILOT-CASE-001,https://example.org/demo-case/1,2026-11-01

From the repository root, once actual permitted input files exist:

    node --test server/neo-crawler/estate-sourcing.test.mjs
    node scripts/neo-estate-pilot.mjs --hcad /private/hcad-real-acct.tsv --case-links /private/case-links.csv --out /private/neo-estate-review.json

The output contains input SHA-256 hashes, counts, source-completeness scores and explicit unresolved fields, not owner names. A completeness score is **not** a valuation, return estimate or sale-likelihood score. Private output includes parcel addresses and docket IDs; do not commit it to public GitHub.

## Boundaries and acceptance
- No genuine HCAD download, County Clerk bulk authorization, licensed probate input, independently validated case-to-parcel match, live qualified leads, acquisitions, or revenue established by this pilot.
- Every candidate retains unknown-heirs, unverified probate, unverified seller authority, no verified listing, and no outreach approval.
- Existing Houston 20+ unit, credible cap-rate ≥4% multifamily acquisition buy-box stays a separate lane; single-family probate leads must not be automatically promoted there.
- No seller or heir contact, county login scraping, access-control circumvention, offers, signing, payments, publishing identifiers or production deployment.
- Before real input: verify current HCAD columns, county data permissions, source freshness, retention, privacy and private storage.

## NEO handoff
**SCROLL / ATHENAEUM:** provenance and independent case-to-parcel review. **NEO Algo:** consistency and duplication checks. **NEO Market Agent:** existing parent schedule. **Deal Desk:** review-only queue after verification. **ORIGIN:** explicit approval for any external transaction.

**Next gate: NEO-ESTATE-CRAWLER-002** — live file-schema review, approved county-record access, private isolated sample import and data-quality measurement. No sixth scheduled agent.
