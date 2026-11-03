# NEO-OMARCHY-004 — Private coordinator foundations and signed audit contracts

Date: 2026-11-03
Status: draft source implementation only; no live NEOpass enrollment, authenticated production coordinator, database migration, cloud provisioning or Omarchy machine deployment.

## Dependency and decision

Stacked PR on `feat/neo-omarchy-003`, following Gate 003 / PR #1331, Gate 002 / PR #1329 and Gate 001 / PR #1326. Merge sequentially only after evidence and the required reviews.

**Design decision:** NEOpass is the *intended* identity issuer, NEO Router the inference policy gateway, Omarchy an optional Linux compute workstation, and PostgreSQL the proposed transactional task ledger. No cloud provider, external gateway or real device is configured.

## Implemented modules

1. `server/neo-omarchy/neopass-proof.mjs`: cryptographic Ed25519 verifier for a *proposed* canonical NEOpass machine-proof contract. Requires a statically pinned operator-approved public key, issuer identifier, key ID and an external revocation lookup. Verifies raw canonical signed claims, machine ID, challenge nonce, audience, enrollment-only scope, one-time proof ID and expiry. It fails closed on unknown keys, malformed data and revoked proofs. **The existing NEOpass service has not been shown to issue this exact format**; real issuer integration and publication of a trusted key remain blockers. The test keypair is generated only inside CI.
2. `server/neo-omarchy/postgres-leases.sql`: restricted-schema draft migration with machines, tasks, lease metadata and audit-event tables. This SQL is not applied automatically. Dedicated database identity, role grants, encryption, backup/recovery and security review are required.
3. `server/neo-omarchy/postgres-leases.mjs`: transaction-aware Postgres pilot repository. Uses parameterized queries, global advisory xact lock, machine approval preconditions, 30-second task lease, one active lease per machine, one attempt per task, expired-work quarantine, one-use completion and revocation. Caller-supplied `proof.verified` and `decision.verified` are trusted **only inside the service boundary** after external cryptographic verification; **do not expose these methods directly to HTTP or user-controlled data**. Until that verified controller exists, this store must not be deployed.
4. `server/neo-omarchy/private-transport.mjs`: outbound-only **private HTTPS application-signature contract**, requiring an approved `.internal` hostname, Ed25519 machine private key and pinned coordinator response-verification public key. It signs every request, binds the server's signed response to nonce, action, machine and expiry, rejects redirects, and accepts only lease polling or receipt submission. There is **no server endpoint**, DNS zone, firewall rule, certificate, client enrollment or live TLS/mTLS verification deployed. DNS/route isolation and mutual TLS must be checked independently; URL validation is not a substitute.
5. `server/neo-omarchy/signed-evidence.mjs`: Ed25519-signed digest receipt with explicit `blockchainAnchorVerified:false` and `independentlyWitnessed:false`. Verifiable against an explicitly pinned signer public key, but **not** automatically off-host archived, independently witnessed or committed to Crown Chain.
6. `server/neo-omarchy/gate-004.test.mjs`: synthetic issuer signatures (generated during tests), mocked HTTPS, mocked SQL queries and rejection paths. These tests do not prove PostgreSQL schema execution or a live Omarchy/Ollama/NEOpass end-to-end run.
7. `.github/workflows/neo-omarchy-004.yml`: unprivileged CI with no network enrollment, installation, secrets, production deployment or database migration.

## Proposed deployment topology (NOT ACTIVATED)

```text
Dedicated Omarchy lab device
  ├─ NEOpass-bound machine key in OS-protected store (future)
  ├─ local Ollama through Gate 002 NEO Router bridge
  └─ outbound, application-signed HTTPS (future private transport)
                   |
                   v
Dedicated NEO coordination service / private listener (NOT IMPLEMENTED)
  ├─ validated issuer keys, nonces, revocation and operator approvals
  ├─ state transitions & transactional task leases in dedicated Postgres
  └─ signed audit digests → independent evidence vault → Crown Chain (future)
```

The current modules cannot be wired together as a live service without authentic approval verification, a trust-authoritative NEOpass issuer, secure remote coordinator endpoints, a dedicated database and a properly isolated device. No software should claim fully operational or ready for production from CI alone.

## Security acceptance blockers

- Certify issuer-owned NEOpass enrollment keys, proof issuance contract, revocation semantics, key rotation and proof replay protections, including persistent challenge/proof-ID consumption. Cryptographic signatures with synthetic keys alone do not authenticate a real NEOpass account.
- Build a private coordinator API enforcing cryptographic operator authorization, least-privilege machine identity, request replay protection, authenticated transport and network ACLs. Ensure the database API cannot be called with self-declared `verified:true` values.
- Apply migration to a verified dedicated non-production PostgreSQL database using least-privilege roles. Test concurrency, lease expirations, restart/recovery and backup/restore with a real Postgres instance. No fake database state or approval is accepted as evidence.
- Provision one approved Omarchy lab device, verified official distribution and sufficient model resources. Install an explicitly licensed local Ollama model; perform a real NEO Router end-to-end inference using a harmless, nonfinancial task.
- Enable encrypted off-host audit capture and independent witness/public key verification with trusted timestamps. Only claim Crown Chain anchoring after a verifiable real transaction/receipt; hash chaining and signature alone do not establish an on-chain record.
- Review TLS certificates, device-key storage, outbound allowlists, emergency revocation and rollback. No public ports, wallet signing, unrestricted shell execution or Cloudflare integration are permitted.

## Local source checks

```bash
node --test server/neo-omarchy/gate-004.test.mjs
node --test server/neo-omarchy/coordination.test.mjs
node --test server/neo-omarchy/lab-bridge.test.mjs
```

**Gate 004 decision:** source-level private coordinator foundations are reviewable. Production activation, operational NEOpass integration, a persistent transaction store and real device enrollment remain **blocked**.

**Next gate — NEO-OMARCHY-005:** issuer-key governance and signed operator approval, a private coordinator implementation with replay-resistant authenticated endpoints, real PostgreSQL integration tests, then an independently witnessed single-machine staging pilot.
