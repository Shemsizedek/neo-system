# Project 144 — NEO Key Gate 5: hardware certification and issuer audit

**Review-only. PR #1435 remains draft. No production sign-in, database migration, paid service, physical key enrollment, Bitcoin broadcast, or ChatGPT/Daybreak account modification.**

## Verified implementation (code)
- The isolated dependency package uses exact direct versions with a committed `package-lock.json` (npm lockfile v3). GitHub Actions should use `npm ci --ignore-scripts` in that isolated package; do not replace this with `npm install` during CI.
- Maintained-library `@simplewebauthn/server` registration verifies RP ID, origin, challenge and UV; verified P-256 COSE credential key is retained as base64url as well as public PEM. A public key is not a password or secret.
- `neo-key-security/assertion-verifier.mjs` verifies signed `webauthn.get` responses with stored COSE public keys, one-use scoped challenges, UV, origin and RP ID; its persistence dependency atomically consumes the challenge and applies a safe sign-count update. Legitimate zero counters (both previous/new zero) are allowed; nonzero regressions denied. Sign counter alone is not a strong clone detector for multi-device synced credentials.
- `neo-key-security/postgres-assertion-store.mjs` supplies the PostgreSQL 16 transaction contract; GitHub CI uses an ephemeral local PostgreSQL service. Existing app databases are not touched.
- `neo-key-security/neopass-authority.mjs` is an *unmounted* fail-closed session resolver requiring a cryptographically validated issuer token, mandatory short expiration, exact audience/purpose, and authoritative active membership. The existing live NEOpass issuer does not issue this new purpose yet; this code is not an activated login.
- The lifecycle's recovery method still requires a freshly verified WebAuthn proof by a separate active backup credential, then transactional revocation. No password/email-only recovery override exists here.

## NEOpass audit findings — blockers before activation
1. `server/neo-platform-api/neopass-google-auth.mjs`'s `verifyNeopassToken()` checks expiry only conditionally (`payload.exp && ...`); it can accept a signed token with no expiration. NEO Key's resolver therefore rejects missing and invalid `exp` unconditionally.
2. Existing `createGoogleNeopassAuth` has executive fallbacks on registry read/write failures and an `executive-admin` role claim shortcut in `session()`. These MUST NOT confer NEO Key enrollment, recovery or bootstrap authority.
3. Configuration checks in `neopass-readiness.mjs` verify presence, not JWT issuer provenance, live registry access, authenticated browser session, proof of recent user verification, rate limits, server-side operator approval or revocation.
4. Do not trust roles in token claims for key management. Use separate, recorded proof of operator bootstrap for the *first* credential; additional credentials require a signed assertion from an already-registered passkey and explicit same-subject approval.
5. No current production NEOpass token purpose `neo-key-session` is verified as implemented. Do not enable integration until a separate issuer/audience/token-use contract is signed off, cryptographically tested, and bound to the authoritative subject registry.

## Physical FIDO2 lab checklist (NOT yet executed)
- [ ] Verify an authorized, isolated HTTPS staging RP with a real DNS name and exact origin; use a test identity and disposable nonproduction database.
- [ ] Identify two independent security keys, primary and sealed backup; do not copy private keys or seed phrases; document hardware and firmware **privately**, never in the public repository.
- [ ] Enroll primary under verified operator bootstrap, then add backup only after recent hardware-backed step-up with the primary.
- [ ] Test registration and WebAuthn assertion on supported Android, Windows and Linux browsers; check RP-ID binding, USB/NFC compatibility, on-device PIN/biometric UV prompts, phishing wrong-origin denial and client cross-origin restrictions.
- [ ] Confirm transient unplug/removal does **not** automatically terminate sessions unless a separately reviewed workstation-lock feature is enabled. Do not use a plain USB flash-drive key file as equivalent to FIDO2.
- [ ] Test one-time challenge replay, concurrent requests across workers, zero counter, nonzero monotonic counter, storage/reconnect and race with revocation using nonproduction keys.
- [ ] Revoke lost primary with fresh backup assertion; block stolen session without backup, wrong owner, expired proof, revoked backup, last-key removal, and double-spend of a proof.
- [ ] Test if both keys lost: hold access, require out-of-band multi-person identity verification, deliberate cooldown, audit and explicit owner approval. No bypass based on email alone.
- [ ] Test database backup restore and migration rollback; ensure credentials, revocation state and audit events remain authoritative after restore.
- [ ] Confirm real-site sessions remain usable or appropriately terminated after backup revocation and account compromise response.
- [ ] Confirm ChatGPT account passkeys are enrolled only through supported OpenAI account settings; Daybreak requires its own applicable authorization and does not support an assumed custom NEO Key hook.

## Vercel build-rate-limiting
Prior GitHub status targets on this branch showed five projects redirecting to `?upgradeToPro=build-rate-limit`. This reflects an account build-rate limit and does not prove a syntax error or code regression. Keep draft PR unmerged; avoid additional paid plans and expensive deployments. For root-cause comparison on historical deployment errors, authenticated project build logs are needed. A Vercel plugin connection is optional; do not claim access until established.

## Next release gates
- Certified `neo-key-session` issuer and trusted server session resolver; no production shortcut on registry failures.
- In-process integration of new registration and assertion modules with authoritative, rate-limited DB-backed adapters; reject stale and unauthenticated enrollment.
- Physical hardware tests, backup availability, recovery proofs, concurrency and cryptographic attestation policy (none-attestation proves public-key possession, not manufacturer-backed hardware origin).
- Real database least-privilege roles, secure backups, observability, rollback drills and independent security review.
- Explicit release approval. Until then keep production disabled and avoid real on-chain writes.
