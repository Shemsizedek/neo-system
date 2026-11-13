# NEO-ACT-004 — Treasury asset-liability register and ledger reconciliation

Status: draft code; not a certified balance sheet or live integration.

## Implementation
- Read-only register separates **assets**, **liabilities**, **community credits**, and **custody observations**.
- Assets require upstream assertions of ownership, custody and valuation verification; liabilities require enforceability review. These assertions remain subject to independent validation.
- Community credits and custody observations are excluded from recognized asset/liability totals.
- Amounts remain in native units and fund IDs, never netted across currencies.
- Journal reconciliation tests debit/credit equality per transaction and unit; it does not certify completeness or origin.

## CES evidence treatment
Community Exchange screenshots and proprietary instrument displays remain documentary evidence only. Internal ledger credits, V-Dollar statements, and issued bond face values are not proof of fiat reserves, independently transferable claims or fair-market value. Issuer obligations and holder rights must be mapped separately.

## Remaining blockers
Authentic source exports and hash manifests; role-governed read-only adapters; independent chain verification; trust and beneficial-ownership authority; legally reviewed liabilities; FX source/quote traceability; instrument-level anti-duplication controls; persistence and authorization tests. No custody keys or signer authority permitted.

## Run tests
`node --test server/neo-actuary/*.test.mjs`

Next: ACT-005 — secured source adapters, instrument identity and evidence reconciliation, CI validation, and gated dashboard prototype.
