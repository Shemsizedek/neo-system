# NEO-OSINT-005 — Global Financial Accountability Network

Status: DRAFT / REVIEW ONLY
Source: https://whofundedgenocide.com/map/
Date of initial inspection: 2026-10-24
Systems: NEO OSINT, NEO Market Crawler, NEO Atlas, Evidence Vault, NEO Crown Chain, NEO Scan, NEO Oracle, N.I.A., NEO Law.

## Purpose
Create a read-only financial-network intelligence adapter for third-party sourced records. The project title of the external source is not a factual determination by NEO. The adapter tracks what specific records show; it does not infer legal guilt, intent, or culpability from a financial link.

## Source discovery
The page advertises six separate network boards, downloadable entity/link/source tables, JSON, Gephi outputs, SHA-256 checksums, and Creative Commons Attribution 4.0 licensing. Snapshot counts are volatile, so never hardcode them. Obtain and retain the original licence text and README before enabling ingestion. At inspection time, web retrieval of `/data/README.txt` and `/data/LICENCE.txt` returned 404; validate source downloads using direct HTTP requests and archive the actual returned bytes.

## Integration sequence (fail closed)
1. Validate source availability, licensing, schema, and real download hashes. Store retrieval time, HTTP status, content type, source URL, declared checksum, computed SHA-256, and immutable retrieval identifier.
2. Ingest CSV/JSON in an isolated sandbox, without remote script execution. Enforce size, record-count and parsing ceilings, and reject malformed CSV formulas when exporting. Quarantine all records until checks pass.
3. Normalize `entity`, `relationship`, `evidence_source`, `collection_snapshot`, `review_event`. Preserve original raw strings alongside normalized values; don't merge homonyms on name alone.
4. Keep six source boards distinct. Do not synthesize cross-board financing paths without an independently cited underlying record.
5. Encode relationship type: CONFIRMED_TRANSFER_IN_SOURCE, REPORTED_RECEIPT, ORDERED, CONTRACTED, CEILING, APPROVED_BUDGET, CO_MENTION, OTHER. These labels are claims **about what a document reports**, not external audit certification.
6. Store original amount, original currency, source record ID, page/location, period, and `payment_evidence_state`. A budget ceiling is not a payment. Do not aggregate different currencies without explicit FX date/source.
7. Corroborate high-impact claims against original registries/filings and preserve conflicts or revisions. A source assertion is not independently verified until review.
8. Hash retained source artifacts, log reviewer approval, corrections, disputes, reversals and removals. A Crown Chain anchor is proof of a recorded digest at a point in time, NOT proof of factual truth or legal responsibility.
9. Publish only approved, appropriately redacted, attributed read-only records in NEO Scan / NEO Atlas. Public panels expose status, context, original filing reference, date, uncertainty, and correction avenue. Operator-only N.I.A. case workspace receives classified data when authorized.
10. No automated accusation, investigation against private persons, sanction, trade, blacklist, wallet restriction or judicial conclusion. Human authorization is mandatory for consequential use.

## Data contract
```json
{
  "schema": "neo.financial_accountability.v1",
  "snapshot_id": "sha256:<hex>",
  "source_url": "https://whofundedgenocide.com/map/",
  "retrieved_at": "<ISO8601>",
  "board_id": "<source-defined-board>",
  "source_record_id": "<source-reference>",
  "origin_entity": {"source_id": "<id>", "name_raw": "<as-filed>", "entity_resolution_status": "UNRESOLVED"},
  "destination_entity": {"source_id": "<id>", "name_raw": "<as-filed>", "entity_resolution_status": "UNRESOLVED"},
  "relationship": {"raw_label": "<raw>", "normalized_type": "CEILING", "money_moved_proven": false},
  "amount": {"raw": "<raw>", "value": null, "currency": null},
  "source_evidence": [{"url": "<primary-document>", "page": null, "sha256": null}],
  "status": "QUARANTINED",
  "confidence": "UNASSESSED",
  "reviewer": null,
  "crown_anchor_txid": null,
  "correction_state": "NONE"
}
```
The JSON is illustrative, not a real observation. Real schema should use strict typed validation and separate raw ingestion from curated review records.

## Public UI
Responsive graph: six board tabs; text/keyboard search; category/currency/type filters; pan/zoom on desktop and touch; alternative accessible tabular view; source drawer; inspect links; clear dashed-vs-solid legend; source/correction badge and revision history; accessible attribution. Do not copy inaccessible widgets. No live labels until data is validated.

## Acceptance criteria / release gates
- Fixture-based tests for transfer vs ceiling vs contract, multi-currency behavior, duplicate entity names, revisions, adversarial CSV, broken links and missing checksums.
- Source-license and attribution compliance confirmed.
- Every displayed edge traces to source document, with observed/reported/verified clearly distinguished.
- RBAC tests for public vs restricted records and an auditable correction process.
- Automated test suite and security checks green; operator reviews sampled source links.
- Read-only preview passes mobile usability and accessibility.
- Explicit Confirm / Merge / Deploy approval before release. NO DEPLOY on creation of this file.

## Next gate
NEO-OSINT-006 — Implement isolated source fetch/validation and fixture tests on a draft branch, then wire a read-only NEO Atlas preview after independent verification.
