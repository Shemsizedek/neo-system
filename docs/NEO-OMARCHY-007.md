# NEO-OMARCHY-007 — Mutual TLS staging pilot, recovery and audit commitments

**Date:** 2026-11-03
**Status:** Draft development implementation. **No real host, NEOpass issuer, private Render deployment, or Omarchy machine is certified.**

## Gate dependency

This is stacked on Gate 006 PR #1334, then #1333, #1332, #1331, #1329 and #1326. Source code and CI must be reviewed in order; there is no automatic merge or rollout.

The authoritative NEOpass service in the current main repository also has legacy Google-linked and shared-secret session surfaces. They must **not** be treated as the new device-proof issuer or as proof of independent NEOpass machine-key enrollment. The Gate 006 `NEO-OMARCHY-DEVICE-PROOF-006` contract remains **proposed** and unissued by an independently verified authoritative NEOpass instance.

## Gate 007 changes

### TLS and machine binding
`server/neo-omarchy/mtls-pilot-007.mjs` creates a local-only HTTPS server using TLS 1.3 and **mandatory mutual TLS**. It only binds `127.0.0.1` on a random port and is not automatically started. The server checks:
- TLS peer certificate chains to the explicitly injected trusted lab CA.
- Client certificate public key is Ed25519 and **exactly matches the approved enrolled NEOpass-bound device public key** returned by Gate 005's trusted machine-key resolver.
- The Gate 005 coordinator separately validates the signed application request, request timestamp, scoped action and consumed replay nonce.
- Only a single worker request is active, bodies are bounded, and server errors are redacted.

The server is a **local proof of the intended private TLS contract**, not a production mTLS proxy and not a certificate issuer. Real private DNS, managed CA key custody, certificate rotation, network isolation and TLS ingress remain unimplemented.

### Evidence
`server/neo-omarchy/audit-commitment-007.mjs` validates audit **linkage and ordering**, calculates a snapshot digest and signs a compact metadata commitment using an injected Ed25519 signing key. It expressly sets:
`sourceEventHashesRecomputed:false`, `independentlyWitnessed:false`, `blockchainAnchorVerified:false`, `productionReady:false`.

**Important:** The prior Gate 004 ledger stored JSONB metadata and computed hashes from the insertion-time JSON serialization. The exact original JSON object key order is not persisted. Therefore the current snapshot verifier can check linkage, but cannot independently recompute every source event hash from the existing PostgreSQL rows. This must be repaired with an explicit canonical event serialization / migration and independent witness before issuing audit-custody claims.

### True TLS and database recovery testing
`gate-007.test.mjs` generates temporary CA, server and client certificates using OpenSSL in the CI job only. It tests:
- A correctly certified and enrolled device using TLS 1.3 can send a signed one-time task request.
- A different certificate signed by the *same trusted CA* cannot impersonate the enrolled key.
- A forged request signature, revoked machine, missing client certificate or wrong server hostname is rejected.
- Signed audit commitments verify with a pinned key; tampering and broken predecessor links are rejected.

`.github/workflows/neo-omarchy-007.yml` provisions a fresh, disposable PostgreSQL 16 service. It re-runs Gate 006's cryptographic enrollment/worker tests, backs up `neo_omarchy` using `pg_dump`, restores into a **separate, newly created disposable** database with `pg_restore`, and checks audit event count and terminal hash. The workflow has no live external database URI, private deployment key, DNS operation or real model invocation.

## Connected infrastructure findings

- Connected Render lists two distinct workspaces, **NEO workspace** and **NEO SYSTEM**; neither has been selected/confirmed for this gate. A workspace choice is necessary before inspecting or creating a service.
- The connected Neon inventory did not return a project named Omarchy; do not repurpose a financial, FX or unrelated staging database without explicit approval.
- No authorized physical Omarchy Linux machine, model, or NEOpass device credential has been presented in this gate.
- No Cloudflare infrastructure is introduced.

## Real staging execution prerequisites

1. Owner selects the correct Render workspace (or another approved private host), provisions a dedicated nonfinancial staging service with isolated private ingress, TLS 1.3/mTLS and firewalls, and proves backout/rollback.
2. NEOpass authority documents and emits the exact signed device-bound proof contract and operator authorization, including issuer keys, revocation, trust rotation, and device-key custody. No unsigned or test-key proof is accepted.
3. Dedicated Neon or other PostgreSQL staging database is provisioned with restricted SQL roles, encrypted connections, backups, verified restore and retention policies, and explicit approval of Gate 004–006 migrations.
4. An owner-authorized dedicated Omarchy workstation is installed (drive safety, provenance verification), with Node 24, reviewed Ollama model and local-only adapter. Run the manual Gate 006 one-shot inference probe. The model output digest alone is not a security attestation.
5. An independently controlled auditor signs or witnesses a corrected canonical audit chain in a separate off-host evidence store. Do not claim Crown Chain anchoring without an independently verifiable transaction.
6. Execute a single harmless scoped task through independently reviewed private staging; verify device revocation, task idempotency, provider no-fallback and a witnessed rollback.

**No production merge/deployment, unattended OS installation, wallet access, Bitcoin settlement, token issuance, financial execution or unrestricted shell access is authorized by Gate 007.**

## Release decision

Synthetic **real TLS** and **real disposable PostgreSQL** testing may certify the source implementation once GitHub Actions passes. It does **not** certify a real NEOpass issuer, production TLS, a physical Omarchy host or a completed remote Ollama task.

**Next gate — NEO-OMARCHY-008:** operator-approved staging environment selection, canonical append-only audit encoding and off-host witness, real NEOpass issuer compatibility, and one real-device end-to-end private task without production privileges.
