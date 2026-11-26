# Project 144 — NEOpass Authenticator Gate 6: Linux stacked integration

**Status:** TEST HARNESS COMMITTED — full cross-branch execution NOT verified.  
**Release:** NO-GO. Branch-only and unmerged. No live login, USB key enrollment, real identities, external Tor/Ollama calls, deployment or spending.

## Verified infrastructure / policy

- Linux GitHub Actions is available for repository tests. Gate 5 head `2fa01e0...` main CI passed: **981 total, 979 passed, 0 failed, 2 skipped**, one being the real PostgreSQL test. See [GitHub Actions run 44972958228](https://github.com/Shemsizedek/neo-system/actions/runs/44972958228).
- Draft PR #1435 now has its own Gate 12 NEO Key cryptography tests with a disposable PostgreSQL 16 service, and records **54 security/unit + 7 PostgreSQL tests passed** at head `ec25fc21...`. These are **separate** NEO Key backend tests, not the combined app.
- Authorized connected Linux hosts are currently unavailable: Remote Desktop Commander `penguin` offline; SentinelX `crown-node-001` offline.
- `server/neo-router/ollama-provider.mjs` and NEO Key `tor-ollama-support.mjs` are code-level integrations, not evidence of reachable Tor/Ollama daemons. Neither is a Linux shell, signer, physical FIDO2 key, or WebAuthn relying party.

## Implemented in Gate 6

`gate6-stacked.integration.test.mjs` is an **explicit opt-in**, synthetic cross-branch test. It dynamically loads the *real NEO Key modules from a second local checkout* rather than vendoring a duplicate or merging unfinished PRs. It is disabled/skipped without:

- `NEO_KEY_SECURITY_DIR`: absolute path to the `deploy/noogle-render/neo-key-security` directory of an authorized local checkout of NEO Key PR #1435 (reviewed/pinned commit)
- `NEOPASS_GATE6_POSTGRES_URL`: PostgreSQL URL with host **127.0.0.1** and database name **neo_key_gate6** ONLY
- `NEOPASS_GATE6_ISOLATED=1`: explicit, disposable test environment acknowledgment
- Installed locked `pg` and `@simplewebauthn/server` dependencies **inside that NEO Key security checkout**

When these gates are met, it assembles: signed synthetic Ed25519 NEOpass session -> two distinct synthetic approval signatures -> actual NEO Key registration verifier -> real app HTTP requests -> actual software-generated ES256 authenticator fixtures -> real PostgreSQL challenge consumption -> signed login with concurrent replay rejection -> backup enrollment with step-up -> target-bound recovery -> session revocation.

All signatures, identities and credentials are generated for the ephemeral test; **passing does not prove physical FIDO2 hardware, independent human controls or production readiness**. HTTP middleware callbacks are synthetic server-side fixtures. No network listener is opened. Recovery is tested via the NEO Key staging service; no public recovery HTTP route is enabled.

The full stacked test has not executed: no disposable PostgreSQL instance or authorized online Linux host was available in this session. Normal `npm test` skips the integration instead of pretending a pass.

## Safe Linux runner plan (operator-controlled)

1. Start with an authorized Linux CI/VM and a new, empty, disposable PostgreSQL 16+ instance listening only on loopback.
2. Check out PR #1447 and PR #1435 into **separate** clean directories, pin their commit SHAs, run `npm ci --ignore-scripts` in the NEO Key `deploy/noogle-render/neo-key-security` directory.
3. Set the three explicit local environment values using the runner's ephemeral environment/secret mechanism. Do not commit a PostgreSQL password or use Neon/Render persistence or a shared database.
4. Run `node --test apps/neopass-authenticator/gate6-stacked.integration.test.mjs`. Require the test to **execute and pass**, not skip.
5. Confirm and record replay/expiry, backup recovery/rollback evidence and exact CI commit SHAs. Compare other Gate 6 negative paths to NEO Key's existing PostgreSQL tests.
6. Destroy the isolated database and workspace; keep PRs draft and production disabled until independently reviewed.

`npm test` includes the test module but it is intentionally skipped by default. Do not auto-provision, auto-install Tor/Ollama, touch USB devices, enable cloud endpoints, or modify GitHub Actions workflows without their separate review.

## Known limitations / follow-up

- The integrated test requires a human- or platform-authorized, isolated PostgreSQL runner; not provisioned here.
- A server-side ceremony database is separate from the NEO Key's own challenge database. The adapter does **not** atomically commit both as a single transaction. Both are one-use and fail-closed; independently review outage/retry semantics.
- The HTTP app's passwordless registration requires a verified NEOpass session and trusted bootstrap approval. The synthetic harness cannot stand in for real identity verification.
- Physical primary and backup FIDO2 keys, recovery from loss of both, independent security review, signer custody, backup restoration, CSRF/rate-limit operations, HTTPS RP certification and real service deployment remain unresolved.
- Tor can carry optional management traffic only after verified proxy + endpoint/TLS policy, and Ollama can help summarize sanitized CI findings; neither may see private signing material or authorize credentials.

**Decision: NO-GO for external staging or production.**
