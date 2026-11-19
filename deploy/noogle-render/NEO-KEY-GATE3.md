# NEO Key Gate 3 — registration, durable credentials and backup-key revocation

**Project 144 / #1434 / draft PR #1435. INACTIVE. No live enrollment, access grants, database migration, hardware credential creation, or deployment.**

## Audited starting point

- Gate 2 had three successful GitHub Actions runs including CI, but also three failing Vercel project checks. Deployment readiness is unverified.
- Root `npm test` omits `deploy/noogle-render/*.test.mjs`; a dedicated read-only PR workflow explicitly runs this isolated slice.
- `neomask-registration.mjs` has a mocked/injected attestation verifier and a nontransactional consume-then-save path; it remains untouched and inactive.
- Existing WebAuthn assertion verification is narrow and does not certify physical hardware provenance or full COSE support.

## Components added

- `neo-key-lifecycle.mjs`: server-only challenge issuance and response coordination. Both issuer/session subject and a recent enrollment step-up/controlled bootstrap must be authoritative, not user flags.
- `neo-key-postgres-store.mjs`: parameterized PostgreSQL contract. Registration consumes an expiring, account/RP/origin-scoped challenge and saves the public credential plus audit event in one transaction; rollback preserves the challenge if credential creation fails. Per-subject advisory locks serialize sensitive changes.
- `sql/003_neo_key_credentials.sql`: **proposal only**. Stable random opaque account handles; hashed challenges with authorization reference; public-key credentials with revocation state; restricted audit metadata. Never commit real user data or secret material.
- Backup-key revocation requires a separately verified fresh signed assertion by an active *different* key, a matching trusted NEOpass subject, and transactional preservation of at least one active credential.
- `neo-key-lifecycle.test.mjs` and `neo-key-postgres-store.test.mjs`: mocks for security-policy and SQL-contract behavior. These are not live hardware or real-PostgreSQL integration tests.

## Security review blockers before activation

1. Implement registration verification using a pinned, maintained audited WebAuthn/FIDO2 library. Validate challenge, exact origin, RP ID, authenticator UV, user presence, credential public key, COSE algorithm and browser ceremony. Injected test results are **not** proof.
2. Implement verified NEOpass session authority, rate-limited hardware step-up for additional keys, and controlled first-key bootstrap. No HTTP boolean, token claim, email alone, or wallet signature may authorize issuance.
3. Provision a permission-scoped private PostgreSQL environment and perform reviewed migration/rollback, transactional concurrency, backup, disaster-recovery and audit-retention tests. This SQL has not been applied.
4. Establish genuine FIDO2 assertion verification, one-time challenge consumption, counter semantics (including genuine zero counters), revocation propagation and cross-worker replay protection.
5. Test primary + independently enrolled backup physical keys; lost primary/backup; stolen session; duplicate credentials; key ownership; last-key safety; cross-worker races.
6. Investigate unrelated Vercel failures before any deployment. Keep all code unmounted in production until sign-off and staged rollback.
7. ChatGPT and Daybreak support only their own provider-controlled login/authorization mechanisms. NEO Key does not add a custom OpenAI auth hook. Bitcoin anchoring remains separately gated, optional and non-identifying.

## Local tests

`node --test deploy/noogle-render/neo-key-lifecycle.test.mjs deploy/noogle-render/neo-key-postgres-store.test.mjs`

No new dependencies, secrets, device access, cloud writes or spending were used.
