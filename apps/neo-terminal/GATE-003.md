# NEO-TERMINAL-003 — Financial evidence gateway

This gate extends Gate 002's isolated `apps/neo-terminal` browser app. It reuses the **Counterparty v2** protocol and non-custodial NEOpay/Counterpay design principle rather than pretending an existing session or live internal service is connected.

## Implemented
- Source-attributed, timeout-bounded public Bitcoin transaction lookup with txid identity verification and confirmed block metadata.
- Counterparty asset metadata lookup with asset identity verification.
- Separate Treasury and Orange Chip™ issuance queries, with source-address and valid-status filtering.
- Interactive terminal evidence panel for transaction/asset/issuer inspection.
- Explicit `NOT_CONNECTED` Crown Chain, NEO Ledger and NEO Books records and `reconciled:false` fail-closed output.
- Fixture-based gateway tests and GitHub Pages workflow publication of the gateway module.

## Outstanding certification
- The existing Counterpay/NEOpay wallet path is **not a shared authenticated session** in this gate. Reusing a protocol URL does not constitute authenticated integration.
- Public browser API CORS, data availability, pagination beyond first 100 issuance events, and commercial rights need independent staging verification.
- No signed Crown Chain attestations, NEO Ledger journal IDs, NEO Books posting references, NEOpass identity, settlement matching, or actual reconciliation have been connected.
- No transaction construction, signing, broadcast, custody, trade execution, or portfolio mutation.

## Next gate
Integrate a private authenticated adapter service for Counterpay/NEOpay, Crown Chain signed attestations, NEO Ledger event IDs, and NEO Books reconciliation IDs; require matching transaction IDs, network, asset, account scope, timestamp, signer and reviewer before a record can move from observation to `RECONCILED`. Use a dedicated TLS backend rather than GitHub Pages for write operations.
