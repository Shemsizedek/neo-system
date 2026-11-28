# NEO-ESTATE-CRAWLER-004 — First genuine-record acquisition attempt

**Date:** 2026-11-15 (America/Chicago)  
**Operator:** Shelton Estate & Co.  
**Parent:** NEO Market Agent; existing draft PR #1429  
**State:** **PARTIAL — genuine 2026 parcel records NOT imported, probate feed NOT connected.**

## Official source evidence

- Harris County GIS public HCAD parcel service: https://www.gis.hctx.net/arcgishcpid/rest/services/HCAD/Parcels/FeatureServer/0 . Metadata exposes `acct_num`, `tax_year`, `state_class`, `total_market_val`, and `confidential_flag`. Confirmed schema and public query form, **not actual feature-row delivery**.
- HCAD MapServer schema: https://www.gis.hctx.net/arcgis/rest/services/HCAD/Parcels/MapServer/0?f=pjson . Property values are assessment data, **not sale prices**.
- Official HCAD public property files: https://hcad.org/pdata/pdata-property-downloads.html ; GIS files: https://hcad.org/pdata/pdata-gis-downloads.html . Files are intended for user database imports, subject to integrity, access and version checks. **No full 2026 real_acct.txt archive downloaded here.**
- Harris County Clerk probate search: https://cclerk.hctx.net/applications/websearch/CourtSearch.aspx?CaseType=Probate . Data Sales/FTP contact `datasales@cco.hctx.net` and phone 713-274-6390; county commercial bulk index scope, use rights, fields and pricing unverified. The prepared Gmail inquiry is **still draft-only**, not sent.

## Actual source attempts and blocker

A public GIS Query URL was requested through web retrieval; no usable feature payload was returned. Direct read-only Node HTTPS fetch from the working container failed with DNS error **EAI_AGAIN**. This is a local network-resolution failure, **not evidence that the county's server is down**. Chat-mode connected Browser was blocked because an originating browser context was absent. SentinelX reported no connected operational host. No external machine, service, paid endpoint or subscription was activated.

No synthetic records have been promoted to county records.

## New code on existing feature branch

- `server/neo-crawler/estate-official-gis-fetch.mjs`: **opt-in** bounded HTTPS query to allowlisted Harris County GIS endpoint. Requests only OBJECTID, parcel ID, tax year, class, assessed market value and confidentiality flag; no owner names, mailing fields or geometry. GET only, no auth/cookies or redirects; max 20 records, 512 KiB, 8s default timeout. Filters and hashes response; generates privacy-redacted, research-only receipt.
- `scripts/neo-estate-official-gis-fetch.mjs`: explicit `--public-readonly` CLI, private 0600 creation-only output; no cron or automatic source queries.
- `server/neo-crawler/estate-official-gis-fetch.test.mjs`: 10 additional mocked/synthetic checks for source restriction, privacy, errors, payload limits and fail-closed semantics.

**Local acceptance:** previous 25 tests + 10 new tests = **35/35 passed**. No remote CI claims; draft PR remains open and unmerged.

### Proposed manual test where official public network access is available

```sh
node --test server/neo-crawler/estate-*.test.mjs
node scripts/neo-estate-official-gis-fetch.mjs --public-readonly --year 2026 --max 10 --out /private/neo-gis-004-receipt.json
```

If it succeeds, the local receipt establishes a direct HTTPS response and hash, **not independently verified title, probate, seller authority, listing or legal status**. All returned rows are `property_reference_only_not_estate_lead`.

## Results

| Acceptance | Observed state |
| --- | --- |
| Official schema and public source paths | Verified via source documentation |
| New collector & local tests | Implemented; 35 / 35 pass |
| Direct HTTPS query | Attempted, DNS blocked |
| Genuine 2026 HCAD feature/property rows imported | **0** |
| Authorized county probate records | **0** |
| Verified case-to-parcel matches | **0** |
| Sellers contacted, contracts executed | **0** |
| Crawler-attributable earnings | **$0 verified** |
| Production activation | **Not approved** |

## Required next evidence

1. Obtain official HCAD 2026 property file or verifiable, bounded direct county GIS response in a permitted network environment; privately record URL, timestamp, size, hash and real field values.
2. Obtain Clerk's written terms for usable probate-case data, index fields, cost, and license. User must approve paid access or sending the saved inquiry.
3. Match each case-to-parcel only with independently sourced official evidence. Preserve unknown heirs, sale authority and availability as **unknown**.
4. After genuine private sample and review, create research-only opportunity queue and review an authorized recurring import. **No property contact or financial commitments yet.**

**Decision:** Gate 004 *engineering readiness* passes; Gate 004 *genuine record import* remains blocked. Work remains under existing NEO Market Agent—no sixth scheduled task.