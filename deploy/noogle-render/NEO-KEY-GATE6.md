# NEO Key — Project 144 Gate 6 security review and staged rollout

**Status: DRAFT, INACTIVE, NO PRODUCTION RELEASE.** Issue #1434 · PR #1435.

## Scope and verified assets
- Maintained WebAuthn ES256 registration verifier and signed assertion verifier with one-time database challenges. Credentials hold only public keys and allowed metadata, never passkey private keys, biometric templates, Bitcoin seeds or wallet signing secrets.
- An unmounted `staging-adapter.mjs` composes strict NEOpass subject validation, registration, assertion step-up, PostgreSQL stores and target-bound recovery. It refuses to construct unless `enabled: true` and all trusted dependencies are explicitly provided. No network server, route, database connection or migration is created automatically.
- Recovery challenges now include a database-backed `action='recover'` and exact `target_credential_id`. A general login assertion or an enrollment step-up assertion cannot authorize revocation. The authentication challenge and counter are atomically consumed under the same subject-scoped transaction lock as revocation. A distinct active backup credential and at least one surviving active credential are required.
- Additional-key enrollment requires a fresh, signed, one-time `action='enroll'` assertion from an existing key; the first key requires an independently verified operator bootstrap. Both decisions are enforced transactionally by the persisted registration policy. These are injectable, audited **boundaries**, not live NEO Pass issuer integrations.
- `postgres.integration.test.mjs` tests the complete simulated primary → signed backup enrollment → fresh target-bound recovery chain against an isolated GitHub Actions PostgreSQL 16 service using software-generated P-256 authenticators and HMAC-signed synthetic test claims. This is not physical FIDO2 certification.

## Known limitations and security review items
1. **Issuer trust**: Production `server/neo-platform-api/neopass-google-auth.mjs` contains an optional expiry check and privileged fallback behavior on registry failures. NEO Key's staged adapter does **not** use that live session path. Before release, institute dedicated `neo-key-session` issuer, verifier with mandatory short expiry, audience/purpose separation, active-account registry lookup and revocation; any registry outage must deny enrollment.
2. **Bootstrap**: The staged operator adapter is explicitly injected and test-only. A production operator process must require independent, recorded identity proof and multi-person approval, once-only signed authorization reference, rate limiting, cooldown and notification. No user email alone or arbitrary role flag is authorization.
3. **Recovery**: Target binding prevents using a general assertion for revocation; test replay, wrong owner, wrong RP/origin, target replacement, duplicate recovery, lost primary, lost backup, last-key protection and compromise notification. A still-valid server session without the backup must not revoke anything.
4. **Passkey lifecycle**: None-attestation does not prove hardware provenance; risk-based hardware authenticity policy remains open. Cross-device synced credentials can legitimately report sign counter zero; counter alone is not reliable cloning evidence.
5. **Database/security controls**: Schema is currently a CI-only proposal. Use least-privileged SQL role, TLS connection, row isolation, migration and rollback review, encrypted backup, replay race tests, cleanup of expired challenges, audit retention, and restore drills. Do not apply to Neon, Render or other production databases during this gate.
6. **User-facing flow**: No live routes, browser UI, session issuer or token grant exists for NEO Key; `enabled: true` is only for isolated composition tests. CSRF, WebAuthn origin checks, CORS, rate limiting, audit and abuse controls must be assessed before exposing an endpoint.
7. **External accounts**: ChatGPT enrollment must use OpenAI-supported account passkeys. Daybreak must follow its existing approved account/access policy; the NEO Key code is not a direct Daybreak authentication integration.
8. **Bitcoin**: Optional hash anchoring is a later nonidentifying audit gate and never a login availability dependency. Do not publish credential metadata or secrets to a blockchain.

## Physical FIDO2 hardware availability — 2026-11-19
- Read-only Desktop Commander device discovery: `penguin` enrolled but **offline** (last seen about 423 hours before inspection).
- Read-only SentinelX inventory: zero connected hosts; `crown-node-001` enrolled but **offline** (last observed connection October 24, 2026).
- Therefore no reachable authorized host can be inspected for local USB/NFC FIDO2 authenticators. No physical security key is claimed present, purchased, enrolled or tested.

## Hardware certification checklist (pending)
- [ ] Connect an approved local workstation, inspect USB/NFC security-key presence without logging private identifiers.
- [ ] Enroll primary and independent backup keys on an isolated HTTPS staging RP; document OS/browser/firmware privately.
- [ ] Verify genuine browser `navigator.credentials.create` and `navigator.credentials.get` ceremonies on supported Windows, Linux and Android endpoints with user verification (PIN/biometric stays local).
- [ ] Test USB unplug/reattach, session persistence expectations, different browser/profile and cross-origin phishing failures.
- [ ] Test loss and revocation of primary with fresh backup; never remove the last active key without explicit out-of-band multi-party process.
- [ ] Confirm signing counter zero handling, hardware-backed attestation policy, device cloning warnings, hardware recovery and owner notifications.
- [ ] Verify issuer signing keys, database backups and rollback; do not reuse NeoMask or Bitcoin private keys for authentication.

## Deployment gates (all must pass)
1. Independent security review of PR #1435: WebAuthn implementation, SQL authorization, issuer integrity, API abuse, test coverage and permissions; resolve all high-severity issues.
2. Confirm staging isolation: separate DNS/RP origins, test-only credential store, no production identities, explicit staged enablement, restrictive IAM and feature flag default-off.
3. Validate real physical keys + backup + recovery and verify no access during issuer/registry outage.
4. Review operational runbooks: logging without secrets, one-time challenge retention, alerting, no-spend rollback, backup restore and emergency account recovery.
5. Vercel: GitHub status links previously directed to `?upgradeToPro=build-rate-limit`; maintain CI-only testing until preview build capacity is available. Do not upgrade plans or bypass controls automatically.
6. Security/owner authorization before *any* production or real account enrollment, merge, infrastructure changes or paid provisioning.

### Rollback / safe stop
Because no service endpoint is deployed, stop by leaving the PR draft and the staging adapter unmounted. For future staging, disable its feature flag, preserve audit records, revoke staging sessions and credentials, roll back a reviewed migration with a verified backup and restore plan. Never disable existing production authentication during testing.

### Next milestone
Issuer certification and real-device test access. This gate is a **software/CI integration milestone**, not a production release or proof of hardware possession.
