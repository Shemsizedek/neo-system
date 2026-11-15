# NEO-INTAKE-002 — Evidence verification and module handoff
Date: 2026-11-13
Parent intake: NEOSYNC-INTAKE-2026-11-13-001
State: partial verification; staged for module ingestion; no production database write claimed

## Scope and provenance
Three uploaded research reports, three paired prompts, 27 claim stubs. Original PDFs and companion extraction JSON files are NOT in this repository. Source claims remain preliminary unless explicitly listed below. The local ingestion ZIP contains source SHA-256 hashes, text extracts, manifest, routing and claim records; it is not committed here. Preserve separate fields for (a) what the report says, (b) original social content, (c) primary official evidence, (d) analyst interpretation and (e) unknowns.

## Primary-source evidence obtained
- UT-METROLOGY-C08 — Utah HB 76: state regulator confirms 2026 law signed March 26, effective July 1, applicable to new large data centers >10,000 sq ft planning at least 75 acre-feet annual water use; operating or construction-started before July 1, 2026 exempt. Source: https://waterrights.utah.gov/data-centers/ . Result: substantiated for applicability/exemption, subject to exact statutory language as appropriate.
- UT-METROLOGY-C01/C02 — NIST's official NISTIR 6025 landing page identifies the 1997 study *Metrology for Information Technology (IT)*. Abstract expressly discusses measurement/testing of digital IT attributes and the objective to apply metrology concepts to IT. Thus this source does not establish the reel's universal assertion that no computer has metrology. Source: https://www.nist.gov/publications/metrology-information-technology-it-0 . Result: primary source located; C01 disputed, C02 exact quotation/interpretation requires further full-text evaluation.
- TX-HB815 background — Texas Legislature's official introduced 89(R) HB 4258 text documents Reynolds' earlier proposal: https://capitol.texas.gov/tlodocs/89R/billtext/html/HB04258I.htm . This verifies the historical bill text, not 90(R) HB 815.

## Secondary corroboration, not promoted to official verification
- TX-HB815-C01/C02/C05: published report dated Nov 11, 2026 says filed by Reynolds and proposed up to $10M per city/county, conditional effective Sept 1 2027: https://www.thestreet.com/crypto/markets/texas-may-let-cities-buy-crypto-with-taxpayer-money . Official 90(R) introduced text and current bill actions were not accessible in this check.
- US-CLASS-ACTION-C01: no court docket search result established during this gate. An absence of located filings is NOT evidence that no filing exists. Keep pending. No credentials or damages computation independently verified.

## Routing and acceptance criteria
1. SCROLL/NIA-002: retain source names, hashes, original source links, report vs instruction type, timestamps, conflict flags and missing companions.
2. ATHENAEUM/NIA-003: create source-to-claim evidence edges, promote only supported individual assertions; no group-level blanket confirmation.
3. NEO Law: TX-HB815 8 claims; US-CLASS-ACTION 10 claims; distinguish proposed/announced/filed/enacted.
4. NEO Oracle / Noology: UT-METROLOGY 9 claims; separate established physical principle, hypothesis, experimental benchmark and marketing claim.
5. NEO Market / Treasury and NEO Algo: read-only derivative consumers with source references; no investments or public claims from unverified items.
6. ORIGIN: approval needed for production knowledge promotion, publication, or other external actions.

## Unresolved
90(R) HB 815 authoritative introduced version and status; NISTIR 6025 precise bit-unit passage; full Landauer/Bérut/Vopson validation; Infoton P30 third-party benchmarks; Texas reserve holding; Anelia Sutton federal docket/credentials/fee and damages primary evidence. Companion data-extraction.json files missing.

## Decision
Pass evidence-index gate with partial primary-source verification. Do NOT mark all 27 independently verified or claim active downstream module/database ingestion. Next: NEO-INTAKE-003, item-by-item source adjudication and controlled module import.
