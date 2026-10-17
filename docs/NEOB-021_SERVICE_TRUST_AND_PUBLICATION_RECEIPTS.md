# NEOB-021 — Teller service trust and Crown receipt controls

## Implemented
- `server/neo-bank/service-auth.mjs` checks an HMAC-SHA256 signature over method, exact route, timestamp, nonce, and request body using a separately provisioned 32+ character service secret.
- Enforces a 60-second timestamp tolerance, POST-only canonical route, and bounded input.
- `validateCrownReceipt` validates a proposed digest/network/txid envelope but returns **verified=false** and **confirmed=false**, even if the caller asserts confirmation. It cannot be used to change ledger or anchoring status.
- Unit tests for valid MAC, modified body, expired timestamp, and unverified blockchain receipts.

## Integration gates still closed
This is a library contract, NOT an exposed Teller endpoint. Before wiring production: persist service nonce consumption transactionally; verify service identity by key identity/mTLS; use exact raw request bytes in MAC canonicalization; add secret rotation and isolated permissions; bind authenticated Teller assertion identity to NEO Pass subject; prohibit customer-supplied subject tokens; add rate limits.

The Crown publication worker has NOT been connected, and no on-chain receipt has been independently verified. A receipt claim must never transition to `ANCHORED` until a chain observer confirms the digest against the actual transaction payload and confirmation policy. Executive approval and publisher authorization are separate.

## Audit reconciliation
Next step: inspect immutable-ish Firestore audit event sequencing, link queue decisions to publication attempts, and build account-scoped reporting. Service authorization remains read-only; no funds movement is enabled.

## Release
NEOB-021: code committed for review; no production deploy. CI results for this gate are pending.
