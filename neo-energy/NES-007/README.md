# NES-007 — NEO Utility OS / Community Energy Accounting

Status: design/implementation scaffold; no live meters or field equipment connected.

## Boundaries
- Simulation: synthetic data only; cannot bill or dispatch.
- Advisory: forecasts and recommended dispatch; no actuation.
- Field control: separate approval-gated integration with qualified local controllers, interlocks, authenticated operators and device-specific commissioning.
- Customer billing requires appropriate revenue-grade meter provenance and legally approved tariffs. NOMNI, CES or time-credit programs are separate from statutory utility billing unless legally authorized.

## First API contracts
- POST /v1/utility/meter-readings (validated ingest, idempotency key)
- GET /v1/utility/sites/{site_id}/balances (read-only)
- GET /v1/utility/sites/{site_id}/outages (read-only)
- POST /v1/utility/dispatch-recommendations (simulation/advisory only)

## Meter accounting requirements
Readings must carry meter_id, site_id, UTC interval boundaries, cumulative register or interval semantics, units, directional import/export, quality, source and receipt timestamp. Reject interval overlaps, negative import/export quantities, duplicate conflicting events and mislabeled synthetic data. Track missing data and revisions as new ledger events; do not silently overwrite billed readings.

## Acceptance
1. Simulated readings never reach billing-eligible totals.
2. Duplicated identical readings have no additional accounting effect.
3. Conflicting duplicates are quarantined.
4. Export and import remain independent nonnegative registers.
5. Disconnected supervisory software cannot override local electrical protection.

## Next engineering tasks
Specify regional tariffs, customer consent/retention policies, meter security, distributed-generation permissions, outage notifications, and commissioning checklists before operational integration.
