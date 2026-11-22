# Project 144 — NEOpass Authenticator Gate 5 (2026-11-21)

**Status: IMPLEMENTATION / VERIFICATION IN PROGRESS. RELEASE: NO-GO.**
**Draft PR:** #1447. **Separate NEO Key draft PR:** #1435. Neither is merged. No live endpoint, production login, user enrollment, paid service provisioning, or credential publication is authorized.

## Results established from GitHub
- On Gate 4 head `d77f5e5eacf2601bbc3f345a78421daf9d434d2c`, GitHub Actions **main CI succeeded**, along with miner, Discord and infrastructure inventory; **NEO Services Architecture Standard failed** and the Vercel preview statuses pointed to build-rate limits.
- That success did **not** execute the app tests: the root `npm test` command did not include `apps/neopass-authenticator/*.test.mjs`.
- Gate 5 corrects the coverage gap in the feature-branch `package.json`: root CI now runs all `apps/neopass-authenticator/*.test.mjs`. A dedicated `npm run neopass-authenticator:test` script is also provided.
- `npm run neopass-authenticator:pg:test` now invokes `run-real-postgres-tests.mjs`, which explicitly fails with exit 2 when the database URL is absent or not a strictly local, disposable PostgreSQL database. This avoids misreporting a skipped real database test as a pass. The guard was executed locally under Node 22.16.0 and correctly refused execution with no URL.
- Offline local reference suite: `node --test` over Gate 4 local working files yielded 55 pass / 0 fail / 1 skip (real PostgreSQL); **not a certification that every current committed file passed CI**.
- Existing NEO Key PR #1435 latest Gate 10 evidence separately reports **46/46 security and 7/7 disposable PostgreSQL 16 integration tests passed** on its own code. Those tests do **not** prove app #1447 fully cryptographically integrates with the NEO Key verifier.

## Why the release is still blocked
1. The new `npm test` coverage must complete on the latest PR commit. The real-PostgreSQL suite remains skipped in normal CI until a dedicated disposable local database and the `pg` package are supplied; do not silently count that skip as success.
2. The app is composed only through an injected NEO Key service interface, currently mocked in its HTTP tests. A **real** combined `#1435 + #1447` synthetic registration/assertion/recovery integration must be run against a disposable PostgreSQL 16 database, with concurrency, expiration, failure/rollback and signed responses verified, before public staging.
3. The real issuer, session revocation, approved operator bootstrap, per-request CSRF/rate limits, recovery backup, signer custody, independent security review, physical primary/backup FIDO2 tests, and dedicated RP origin remain prerequisites.
4. USB Raptor, USB-Key and arbitrary USB files cannot provide an attested OpenAI Daybreak FIDO2 key or secure NEO administrator authentication.
5. Do not mutate GitHub Actions workflow definitions or purchase preview capacity without separate review/authorization. No staging or production activation during this gate.

## Required execution in an authorized disposable runner

```sh
npm run neopass-authenticator:test
# Only in an authorized disposable PostgreSQL 16+ runner:
# export NEOPASS_DISPOSABLE_PG_URL='postgresql://test-only-user:...@127.0.0.1:5432/neo_pass_disposable_test'
npm run neopass-authenticator:pg:test
```

Never point the second command at Neon, Render persistent databases, a shared staging DB, or production. It creates/truncates/drops its own test table. An available username/password should be delivered via runner secrets, never committed to Git.

## Next technical gate
Coordinate stacked integration with draft NEO Key #1435 using its reviewed `createNeoKeyStagingAdapter`, maintained SimpleWebAuthn verifier and disposable PostgreSQL fixtures; run end-to-end synthetic WebAuthn login and dual-control recovery under a trusted same-origin HTTP test harness. Add dedicated CI job only through reviewed workflow change. **NO-GO** until independently certified.

**No production change, merge, real enrollment or spending.**
