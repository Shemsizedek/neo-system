# NTEL-013 — NEO Evidence Vault bridge validation

The existing `server/neo-evidence-vault/store.mjs` supports `getEvidence(id)` and returns an evidence record with `asset` and `reviewStatus`; its existing SQLite schema does not store a content SHA-256 digest or Crown Chain anchoring receipt.

A new NeoTele adapter accepts a trusted vault lookup and access-controlled document-byte loader. It checks the record belongs to the NEOTELE asset and has ACCEPTED review status, then computes the actual document SHA-256 digest and compares in constant time. It returns explicit `crownChainAnchored:false` and `activationAuthorized:false`.

The trusted document-byte storage connector and Guardian WebAuthn verifier still need real implementations. This adapter does not issue an on-chain Crown Chain attestation and does not prove a cellular carrier agreement merely because an internal record was marked ACCEPTED.

Run `node --test server/neotele/*.test.mjs`. No production integration, database migration, eSIM issuance or deploy in this gate.
Next NTEL-014: authorize and wire document retrieval and Guardian verification through real backend services, include their tests in main CI, then evaluate an authenticated staging route.
