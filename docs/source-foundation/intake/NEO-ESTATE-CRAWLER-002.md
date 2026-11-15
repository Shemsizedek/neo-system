# NEO-ESTATE-CRAWLER-002 — Live-source access and private-data validation gate

Date: 2026-11-15
Business operator: Shelton Estate & Co.
Workstream: NEO Estate & Probate Opportunity Intelligence, a sub-lane of the existing NEO Market Agent
Parent: NEO-ESTATE-CRAWLER-001 and draft PR #1429
Status: **PARTIAL: verified official source documentation and 17 offline tests; NO genuine 2026 HCAD file imported; NO licensed probate feed**
Approval level: read-only research and private local preflight only.

## Why this gate exists
Automating source discovery and record classification is NOT autonomous income. No verified estate lead, authorized seller, paid client, acquisition, contract, closing or cleared fee has resulted from the crawler. The source evidence must remain separate from revenue forecasts.

## Official sources and current state
1. **HCAD 2026 certified property dataset:** https://hcad.org/pdata/pdata-property-downloads.html — public download page identifies **2026 Certified Values**, last updated **November 01, 2026**. Actual 2026 Real Property Data ZIP or real_acct.txt bytes were **not retrieved** into this workspace. Large archive downloads may be expensive in time/bandwidth. Codebook describes 2026 field layout but does NOT prove data file authenticity.
2. **HCAD import instructions:** https://hcad.org/assets/uploads/pdf/Import_Instructions.pdf — tab-delimited ASCII with headers, e.g. Real_acct_owner.zip containing real_acct.txt, deeds.txt, owners.txt and other files.
3. **HCAD codebook:** https://hcad.org/assets/uploads/pdf/pdataCodebook.pdf — real_acct: account `acct`, tax year `yr`, site street `site_addr_1`, city `site_addr_2`, ZIP `site_addr_3`, `state_class`, `tot_appr_val` (appraised value), and `tot_mkt_val` (market value). These are NOT asking prices. Additional files include `ownership_history.txt` and `building_other.txt`. The latter's occupancy/operating metrics do not automatically establish current verified NOI or cap rate.
4. **County Clerk probate public search:** https://cclerk.hctx.net/applications/websearch/CourtSearch.aspx?CaseType=Probate — available for individual research. No authorized automated extraction from interactive court forms.
5. **County Clerk bulk index and FTP:** https://www.cclerk.hctx.net/PublicRecords.aspx — Clerk describes **paid** pipe-delimited text index files by date range and a separately purchased **monthly daily FTP feed**. Probate case coverage and field mapping have not been supplied. Data Sales: datasales@cco.hctx.net / 713-274-6390. A request for written field layouts, fees and permitted commercial use was prepared as a Gmail **DRAFT**; no email sent, fee incurred or subscription created.

## Code produced in the existing review branch
- `server/neo-crawler/estate-source-preflight.mjs` — validates official HCAD codebook field names, tab headers, a bounded sample, expected 2026 year, hash of submitted file; emits only aggregate counts and provenance metadata. No owner name or address output; rejects missing core fields, wrong year or malformed rows.
- `scripts/neo-estate-source-preflight.mjs` — read-only local CLI; writes creation-only 0600 JSON. No network access or automatic source import.
- `server/neo-crawler/estate-source-preflight.test.mjs` — 9 synthetic tests for schema, year, privacy and write-once behavior; plus Gate 001's 8 synthetic tests => **17/17 local Node 22 tests pass**.

Run from repo root after obtaining an authorized actual HCAD export:

```bash
node --test server/neo-crawler/estate-sourcing.test.mjs server/neo-crawler/estate-source-preflight.test.mjs
node scripts/neo-estate-source-preflight.mjs --hcad /private/real_acct.txt --year 2026 --sample 50 --out /private/neo-hcad-source-check.json
```

The second command has NOT been tested on actual 2026 HCAD data. The output deliberately includes `source_authenticity_verified: false` until independently corroborated acquisition and integrity evidence is available. Hashing a local file proves identity of the local bytes, NOT official provenance.

## Promotion controls and acceptance
- **G2.1:** Obtain official original 2026 Real Property Data download (no guessed URL), record source URL, HTTP headers when available, date, size, digest and terms; validate actual tab-separated header and sample. Do not commit the raw owner data to GitHub.
- **G2.2:** Obtain written county clerk answer on probate index coverage, permitted machine use, sample fields, date ranges, fees and data retention. Do not pay or subscribe without separate approval. The public search interface is not an API.
- **G2.3:** Prepare restricted case-to-property link evidence with original case link, recorded parcel mapping and reviewer. A probate filing does not prove deceased owner of any mapped property, title, sale authority, absence of heirs, or willingness to sell.
- **G2.4:** Isolated import 10-20 genuine records with original source citations and audit log in private storage. Validate linkage; keep every unresolved state unknown. No lead outreach.
- **G2.5:** Only after G2.1–G2.4 consider staged database adapter and recurring *read-only* ingestion. Existing NEO Market Agent schedule remains the single parent; no new scheduled task.

## Routing
NEO Market Agent (existing) -> NEO Crawler (local source validator) -> SCROLL (restricted source integrity) -> ATHENAEUM (record reconciliation) -> NEO Algo / Deal Desk (research candidate) -> ORIGIN (approval for outside actions).

## Explicit restrictions
No unattended offers, contacts to owners/heirs, legal representations of 'heirless' or 'abandoned', contracts, transfer of funds, title filings, acquisition, referral fees without eligible service terms, publication of property-owner PII, production database writes or claimed revenue.

## Next gate
**NEO-ESTATE-CRAWLER-003 — Authorized records delivery and first genuine isolated private import.** The blocker is acquiring actual HCAD 2026 dataset bytes and permission/format for a probate index, not additional marketing tools.
