# ComFi-015: authorized local source import and review

NEOscan now links to `comfi.html`, a dedicated local-file evidence workspace. Users select a JSON source bundle, acknowledge authorization and supply an export/document reference. Imported records remain in memory; the page has no network requests, storage, analytics, external frames, or write controls. Authorization is a user acknowledgment, not a cryptographic access check. Host/browser extensions remain outside this control boundary.

The shared model lives in `apps/neoscan/web/comfi-evidence.mjs`; the previous adapter path re-exports it. All modules are included by the existing Pages web-directory copy. This PR does not deploy them.

## Import contract

Maximum 2 MiB, 10,000 records and 10,000 links. Shape:

```json
{"schema":"neo.comfi.source.v1","projectId":"Synthetic","records":[{"id":"r1","kind":"ces_posting","ledger":"CES","account":"synthetic","reference":"export-row-1","unit":"CES:SYNTHETIC","scale":2,"amount":"100.00","effectiveDate":"2026-10-25","sourceRefs":["synthetic-export"]}],"links":[]}
```

Record fields and relationship types follow COMFI-014. Amounts must be decimal strings, never JSON numbers. Import stamps observation time and source reference. It resets record classification to `source_observed` and links to `candidate`; an imported claim cannot mark itself independently corroborated. Invalid imports are rejected atomically. Re-import replaces the workspace and never appends duplicate balances. Filtering and clearing are local. No automatic conversion or consolidated value is produced.

This release accepts prepared JSON exports; it does not parse PDF/OCR, automatically map raw CES CSV, log into CES, connect bank accounts or certify collateral. No private source records are committed.

## North Carolina research correction (2026-10-25)

Official S327 history shows referral to Rules and Operations of the Senate on March 19, 2025. Johnson and Overcash are primary sponsors; Moffitt is an additional sponsor. The supplied senate.gov committee link concerns the federal Senate. NC eProcurement links its official public vendor portal at https://evp.nc.gov/ rather than the supplied vendorportal.com link. Registration is distinct from award or reserve-program admission. The bill proposes state custody/control and acquisitions via regulated US exchanges; it does not establish NEO eligibility. No contact or registration was submitted.

Sources: https://www.ncleg.gov/BillLookup/2025/S327 ; https://www.ncleg.gov/Sessions/2025/Bills/Senate/PDF/S327v1.pdf ; https://eprocurement.nc.gov/

## Validation

`node --test apps/neoscan/adapters/ces/*.test.mjs`: 20 passed. Includes exact decimals, rejected numeric amounts, duplicate source records, malformed/oversized inputs, required authorization/provenance and imported-review downgrades. Browser interaction smoke checked separately when available.
