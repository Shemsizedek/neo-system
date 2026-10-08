# N.I.A. Build 022 — Core vertical slice

This is an isolated, in-memory reference implementation for case registration, source provenance, SHA-256 evidence integrity, claim creation, reviewer-controlled versioned assessments, access checks and hash-chained audit entries.

Run: `node --test server/nia/core.test.mjs`

## Scope and limitations
- No HTTP endpoints, persistent database, cloud deployment, wallet signing or production authorization.
- Evidence bytes are not stored: the caller must preserve originals in an approved evidence vault.
- The audit chain is demonstrative and held in memory, not a tamper-proof production audit service.
- The simple clearance ordering is not a replacement for NEO Law's compartment- and purpose-aware policy engine.
- Do not ingest real sensitive case material until persistence, policy, retention and access controls have been reviewed.
- Branch only; merge and deploy require separate approval.
