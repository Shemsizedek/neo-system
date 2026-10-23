# KI-015 — Durable storage and NEOpass runtime certification

## Decision: no live KNOWINDEX knowledge writes yet

The public Noogle index is live and read-only. The opt-in contribution API is deployed to the NEO Platform API recovery service but is deliberately disabled until an authenticated, restorable transaction store and authoritative identity runtime are certified. Merely setting a flag is not certification.

## Confirmed infrastructure (2026-10-23)

- Existing Render service: neo-platform-api-recovery, main branch, latest KI-014 deployment reported live. Anonymous GET /api/v1/platforms returned HTTP 200.
- Anonymous GET /api/v1/noogle/knowledge/contributions returned HTTP 503 with knowindex_writes_not_configured and writesEnabled false; this is the expected safe state.
- Noogle public index still contains only a reviewed World Library landing-page snapshot.
- Render PostgreSQL noogle-connect-dev is free, development-specific, expires 2026-11-15 and has no managed backup or PITR.
- Render PostgreSQL neo-pads-production belongs to another product. It must not be modified or reused for KNOWINDEX without verified isolation, ownership, risk approval and backup evidence.
- Existing repository workflows inspect Cloud Run NEOpass signing/secret references, but repository presence is not proof of actual production issuer keys, runtime permissions, login, or revocation verification.
- The older Noogle Connect ES256 verification contract is session-only and does not itself prove contributor eligibility or curator authorization.

## KI-015 implementation

- server/neo-knowindex/migrations/001_durable_contributions.sql — isolated knowindex PostgreSQL schema; state/rights constraints, unique idempotency keys, and append-only audit triggers.
- server/neo-knowindex/postgres-ledger.mjs — pool-injected transactional adapter compatible with the existing contribution HTTP service, with database-wide advisory locking of audit writers, role checks, idempotency, submission limits, optimistic concurrency, audited withdrawal, and audit tamper detection. No automatic schema migration.
- server/neo-knowindex/http.mjs — awaits asynchronous durable store operations while preserving disabled-by-default authentication and origin protection.
- .github/workflows/knowindex-postgres-cert.yml — spins up a disposable PostgreSQL 16 CI service; tests isolated role privileges, real SQL adapter, concurrency, moderation, audit integrity and post-restore checks. Uses pg_dump and pg_restore to restore into a second disposable database; does not touch any Render database or store a data dump as a GitHub artifact.
- scripts/verify-ki015-postgres-restore.mjs — checks restored state and hash continuity, restricted to the explicitly named CI restore database.

Successful CI verifies the software contract against a fresh database. It is **not** a production backup certification or real NEOpass identity attestation.

## Production activation prerequisites

1. Identify the actual NEOpass token issuer, signing algorithm, audience, JWKS/secret distribution, session expiry, revocation check, active membership source and privileged reviewer role mapping. Test a real issued short-lived token, expired/revoked tokens, cross-audience tokens and pending identities. Do not accept caller-supplied role or x-neopass-subject.
2. Obtain authorization for an isolated, durable KNOWINDEX data store with a dedicated least-privilege runtime role. Do not create a paid resource, modify NEO Pads data or repurpose an expiring development store without explicit approval.
3. Before any data ingest, verify automated backup schedule, off-host retention, restore into a separate service, tested recovery time, and accessible operational owners.
4. Apply the approved schema migration through a privileged migration-only identity. The runtime identity must not own schema, DROP tables, disable audit triggers or modify audit events.
5. Bind the production NEO Platform API to a verified registry-backed NEOpass authService and the PostgreSQL adapter through explicit runtime configuration. Keep knowindexWriteEnabled false until all checks and rollback probes pass.
6. Run a controlled pilot with separate contributor and independent curator. Verify consent, rights, request-size and per-user rate limits, idempotency, invalid token rejection, stale review rejection, withdrawal and tamper detection.
7. Keep external audit head checkpoints outside the same mutable database, alert on drift, and test emergency disablement without changing public search.
8. Maintain a separate reviewed release approval for public indexing. A knowledge contribution marked approved is **not published** to Noogle by this service.

## Emergency stop

Unbind the authenticated contribution runtime or set knowindexWriteEnabled false and redeploy the validated configuration; GET/POST on the write subtree must return 503. Preserve stored records and audit chains. Public Noogle Pages search must remain available independently.

## Explicit non-goals

KNOWINDEX token writes, treasury operations, wallet signing, asset transfers, NEO Crown Chain transactions, unrestricted crawling, private Drive scraping, and unverified third-party full-text copying remain outside this gate.
