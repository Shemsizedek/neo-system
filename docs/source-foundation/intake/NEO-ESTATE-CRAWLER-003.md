# NEO-ESTATE-CRAWLER-003 — First genuine-record acquisition gate

Date: 2026-11-15. Operator: Shelton Estate & Co.
Parent workstream: NEO Market Agent → NEO Crawler → SCROLL → ATHENAEUM → NEO Deal Desk.
Parent implementation: draft PR #1429, feature branch feat/neo-estate-crawler-001-offline.
**Status: PARTIAL. Official live source metadata verified; actual 2026 property rows not acquired or imported. No probate feed, verified estate leads, approvals, contacts or revenue.**

## Evidence of genuine sources

1. HCAD official public download page: https://hcad.org/pdata/pdata-property-downloads.html — shows 2026 Certified Values, last updated 2026-11-01. A real Real_acct_owner.zip / real_acct.txt archive was not obtained in this session; the previous TSV/HCAD tests use synthetic fixtures. Do not call the dataset imported.
2. Harris County GIS official HCAD parcel feature layer: https://www.gis.hctx.net/arcgishcpid/rest/services/HCAD/Parcels/FeatureServer/0?f=pjson — official metadata documents public REST Query operation and columns acct_num, tax_year, state_class, total_market_val, confidential_flag, owner_name_1 and others. GIS is not probate; service update time and parcel year must be verified on retrieved records. The public endpoint description was verified, **not** returned feature rows: query request failed through the available retrieval environment. Metadata is not an authenticated export.
3. Harris County Clerk probate public search: https://cclerk.hctx.net/applications/websearch/CourtSearch.aspx?CaseType=Probate . The Clerk states bulk index files and separately purchased FTP daily updates can be requested from Data Sales (datasales@cco.hctx.net / 713-274-6390): https://www.cclerk.hctx.net/PublicRecords.aspx . Probate-case coverage, fields, commercial usage, and fee schedule still unconfirmed. The inquiry in Gmail is a **draft, not sent**.

## Implementation

A new offline read-only ArcGIS snapshot adapter was added on the existing draft review branch:

- server/neo-crawler/estate-arcgis-snapshot.mjs — processes an operator-supplied JSON feature envelope from an allowlisted county GIS layer; no network requests; drops owners, mailing/contact fields and geometry; skips confidential-flagged records; normalizes parcel ID/year/class/value; deduplicates; applies record and input size limits.
- scripts/neo-estate-arcgis-snapshot.mjs — local CLI; private, creation-only mode-0600 output, explicit source attribution.
- server/neo-crawler/estate-arcgis-snapshot.test.mjs — eight synthetic tests for source allowlist, redaction, deduplication, wrong-year rejection, confidential-record exclusion, no evidence-status promotion and overwrite controls.
- Together with the previous 17 tests: **25/25 local Node tests passed** in an isolated container. GitHub CI and production have not been independently verified.

Invocation after an authorized actual response file is available:

    node scripts/neo-estate-arcgis-snapshot.mjs --input /private/authorized-harris-parcels-response.json --source "https://www.gis.hctx.net/arcgishcpid/rest/services/HCAD/Parcels/FeatureServer/0/query" --year 2026 --max 20 --out /private/estate-gis-003.json

A claimed source URL does not authenticate a user-supplied file. The adapter always sets source_authenticity_verified=false. A local hash confirms only identity of the bytes supplied. Output is a private parcel reference list, NOT an estate lead, title/authority verification, offer or revenue claim.

## Gate decisions

| Gate | Result |
| --- | --- |
| 2026 certified HCAD publication and official field schema | Documented |
| Official Harris GIS layer field schema and public query operation | Documented |
| Actual source-authorized 2026 HCAD archive read here | Not achieved |
| Actual GIS feature rows from a network query imported | Not achieved |
| Probate case licensing/data authorization | Pending |
| Real probate-to-parcel matches | Zero verified |
| Agent-led owner contacts, offers and transactions | Zero |
| Earned revenue attributable to crawler | $0 verified |
| Production crawler activation | Blocked |

### Enforcement

Do not infer an owner is deceased, an estate lacks heirs, a property is abandoned/listed, someone can sell it, or an appraisal equals an asking price. Do not publish owner/heir identifying data. No autonomous solicitation, contracts, purchases, deployments, transfers, subscription charges, or bypass of access controls.

## Next acceptance gate: NEO-ESTATE-CRAWLER-004

Obtain official 2026 HCAD real_acct.txt archive or verifiably captured and permission-compliant County GIS JSON response with origin, retrieval timestamp and hash. Run a bounded isolated import. Secure the Clerk's written probate coverage, permitted use, pricing and sample schema; later independently match case to parcel before building a research-only opportunity queue.

No sixth parent automation; monitor material access changes under the existing NEO Market Agent.