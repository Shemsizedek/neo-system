# Project 144 — NEOpass Authenticator Gate 3

**Scope:** Protected HTTP adapter **code only**, added to draft PR #1447. Neither the adapter nor the WebAuthn UI is mounted into a running server. No production or network-accessible staging endpoint was activated.

## Files and tested behavior
- `staging-http-adapter.mjs` exports `createIsolatedStagingHttpAdapter`, which returns a disabled 503 handler unless explicitly constructed with `enabled:true` and every required trusted dependency.
- Four same-origin POST operations: begin/finish registration and begin/finish authentication. These names match the prototype browser client.
- Trusted account, session, stable session key, CSRF check, rate limit, enrolled credential lookup, enrollment authorization and durable one-use ceremony store must be **injected from server-side code**, not HTTP JSON. Unavailable dependencies fail closed.
- Server-chosen registered credential ID supplies the NEO Key `beginAuthentication` precondition. The client cannot choose the account/credential, subject, RP, origin or enrollment authorization.
- Server-issued challenge is bound to authenticated session and ceremony type, then atomically taken once. The signed `clientDataJSON` must name the same challenge/type/origin; the NEO Key cryptographic backend must still independently validate full WebAuthn signature, UV, RP, replay and key ownership.
- On successful WebAuthn verification, the adapter deliberately returns `permissionGranted:false` and **never creates sessions, signs wallets or grants access**.

## Integration evidence and limitations
Existing NEO Key PR #1435 (branch `feature/neo-key-gate2-prototype`) exposes `createNeoKeyStagingAdapter` with `beginAuthentication`, `verifyAuthentication`, `beginRegistration`, and `finishRegistration`. This gate aligns only the HTTP adapter interface with those methods. It does **not** import, deploy or certify their backend implementation.

The unit harness uses a synthetic **mock staging service**, synthetic session and an **in-memory map only for tests**; the integration is not yet a real SimpleWebAuthn/PostgreSQL end-to-end server run. Production requires an independent security assessment of the full stack and actual separate FIDO2 hardware primary/backup keys. No physical USB key was detected or enrolled.

## Required before mounting into isolated staging
1. Verified NEOpass issuer, session revocation and authenticated subject; narrow authorized operator bootstrap / step-up with independent signer custody.
2. Reviewed same-origin session cookie and CSRF middleware. Implement `authenticateRequest` and `verifyCsrf` from trusted server state, not from a caller-provided boolean.
3. Durable PostgreSQL ceremony store with atomic `put/take` keyed by account, opaque session key and ceremony type; expiration, uniqueness, distributed replay and crash/restart tests.
4. Rate-limit and abuse controls at HTTP edge, per account/device/IP. `lookupCredentialId` must only return a credential belonging to the verified session subject, never a client-selected credential.
5. Bind approved enrollment evidence to verified operator/step-up authority; no request-body flags accepted. Align browser CSRF provisioning and WebAuthn credential JSON with maintained SimpleWebAuthn library.
6. Full integration test with NEO Key PR #1435 and disposable PostgreSQL, negative concurrency/rollback tests; only then real hardware lab, independent reviewer signoff and isolated staging.
7. Keep all login UI disabled until these independent gates are satisfied; branch remains draft/unmerged.

## Verified local test
`node --test apps/neopass-authenticator/staging-http-adapter.test.mjs`: **28 passed, 0 failed**, Node.js 22.16.0, using synthetic Web API requests and mock service. Committed test/source blob hashes were checked against tested local files. GitHub Actions status must be verified separately. No secrets, live users, database migration, authentication tokens or Bitcoin signing.
