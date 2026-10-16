# NTEL-011 — Durable Noogle Evidence Approval

New PostgreSQL transaction adapter locks a pending evidence record, refuses self-review, conditionally increments its revision, and writes an evidence audit event plus an outbox event before COMMIT. Rollback occurs on error. No direct provider activation action is available.

This module assumes the NTEL-010 trusted NEOpass/Guardian verifier already checked the reviewer. It does **not** itself verify cryptographic signatures, authenticated database roles, underlying documents or Crown Chain anchoring. For production, enforce authenticated caller binding at DB/service boundary and correlate short-lived device approval proof to record revision and digest. Never accept client-supplied independentlyVerified flags as final proof.

Schema is a proposed migration; do not claim it has been applied. Crown Chain Evidence Vault receipt verification is still unintegrated.

Tests: `node --test server/neotele/*.test.mjs`.
Next: NTEL-012 combine evidence submission, immutable storage, cryptographic Guardian replay controls and backend HTTP integration under security review.
