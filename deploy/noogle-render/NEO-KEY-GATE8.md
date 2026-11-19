# Project 144 — NEO Key Gate 8: isolated staging release readiness

**PR:** #1435 (draft; must remain unmerged) · **Change category:** security prototype and tests only · **Production:** untouched · **Spending:** none.

## What was independently observed
- GitHub source review confirms the Gate 7 Ed25519 issuer, two-approver signatures and PostgreSQL approval consumption. Both require **trusted caller-provided identity and operator-verification callbacks**; they are not proof of production trustworthiness.
- Repeated read-only hardware inventory: Desktop Commander `penguin` remains offline; SentinelX has zero connected hosts, with `crown-node-001` offline. No evidence of physical USB/NFC FIDO2 keys; no remote command, inventory probe or enrollment performed.
- No production NEO Key route or bearer-token service was deployed. No Neon/Render user database migration, DNS change, Vercel plan upgrade, OpenAI passkey or Bitcoin transaction was performed.

## Gate 8 security findings and mitigations

| ID | Finding / threat | Gate 8 change | Evidence / remaining limit |
| --- | --- | --- | --- |
| G8-01 | A staging issuer callback could authorize a signed token with no durable session allowlist entry | `staging-issuer.mjs` now **requires** `registerSession` to persist JTI before signing; failure denies issuance | Test rejects offline store; **real production identity-proofing callback still absent** |
| G8-02 | Revocation was represented by a callback contract without a concrete persistent implementation | Added `postgres-session-store.mjs` and `neo_key_staging_sessions` proposed schema; allowlisted JTI, subject, expiry, revocation, subject-wide invalidation, duplicate JTI prevention | Tested in disposable PostgreSQL; schema NOT applied to any live service |
| G8-03 | A recovered credential could be revoked without a surviving audit record if audit-write persistence failed | Added PostgreSQL failure-injection test that deliberately rejects audit insert; transaction must roll back revocation, then pass after test failure removed | Proves atomic rollback only for simulated errors, not full backup/restore or disaster recovery |
| G8-04 | One account owner could control both approver keys, despite distinct signatures | Existing distinct public keys/IDs check retained; **organizational independence not cryptographically provable** | Two human or organizational custodians, approval custody logs and maker/checker conflict policy require separate independent review |
| G8-05 | Existing production NEOpass does not certify NEO Key's narrow issuer/session profile | Keep staging issuer unmounted, token audience `neo-key`, purpose `neo-key-session`, short expiration, active-account registry check and no executive fallback | Real issuer, key rotation, protected signing service, rate limits and live status/notification still pending |
| G8-06 | Hardware state unknown | Read-only inventory rechecked; both authorized hosts offline | No hardware certification or user enrollment claim |
| G8-07 | Vercel preview checks failing | No changes to deployment configuration or plan; CI-only test workflow remains the verification method | Prior statuses linked to `?upgradeToPro=build-rate-limit`; cannot certify a Vercel preview deployment |

## Verification commands in disposable CI
```sh
npm ci --prefix deploy/noogle-render/neo-key-security --ignore-scripts --no-audit --no-fund
node --test deploy/noogle-render/neo-key-prototype.test.mjs deploy/noogle-render/neo-key-lifecycle.test.mjs deploy/noogle-render/neo-key-postgres-store.test.mjs deploy/noogle-render/webauthn-assertion.test.mjs deploy/noogle-render/challenge-service.test.mjs deploy/noogle-render/neo-key-security/registration-verifier.test.mjs deploy/noogle-render/neo-key-security/assertion-verifier.test.mjs deploy/noogle-render/neo-key-security/neopass-authority.test.mjs deploy/noogle-render/neo-key-security/staging-issuer-approval.test.mjs
# Separate GitHub Actions job runs postgres.integration.test.mjs against
# ephemeral loopback PostgreSQL 16 in CI, not against user databases.
```

### Evidence to capture for final review
- Exact PR head SHA and CI job/run links, with passing unit and PostgreSQL integration totals.
- SQL rollback proof: both credentials active after denied audit insert; only requested key revoked after repair; backup retained.
- Issuer proof: token unavailable when JTI persistence fails, revoked JTI refused, expired and mis-scoped token rejected, registry outage denies sensitive operations.
- Bootstrap proof: distinct Ed25519 approver public keys, canonical payload, case/subject/RP/origin/expiry, one-use consumable database receipt, duplicate/conflicting approval rejection.
- Device proof: actual FIDO2 hardware models, certificate/attestation policy, OS/browser matrix and signed test result **privately**. Never record PINs, serial identifiers, biometric templates, wallet seeds or user secrets in this public repository.

## Gate 8 independent reviewer checklist (NOT signed off)
- [ ] Confirm issuer key custody, key matching, rotation, vault/HSM storage, revocation and audit trail; no default keys, logging of JWT, or token replay path.
- [ ] Verify server-controlled first-key approval request issuance, true two-person independent operator identity, approve/deny audit, conflict of interest, timeout, expiry and revoke.
- [ ] Review browser origin, CSRF, credential/RP binding, registration entropy, challenge one-time semantics, recovery action/target binding, counter zero/monotonic behavior and concurrent requests.
- [ ] Review PostgreSQL grants, TLS, RLS/tenant isolation, transaction lock scope, audit integrity, expired challenge purge, backup encryption, database restore and rollback of partially completed migrations.
- [ ] Conduct incident exercises: issuer outage, registry outage, active-key theft, backup lost, both keys unavailable, revoked key replay, forced HTTP request and database failure.
- [ ] Perform real primary + independent backup FIDO2 enrollment and recovery with an authorized workstation and a dedicated HTTPS staging RP, with browser UV.
- [ ] Confirm dependency lockfile/SCA, CI permissions, review acknowledgements, Vercel quota, and an explicit operator sign-off.

**No independent human security certification has been received.** Technical integration passing is not a release approval.

## Controlled isolated staging release blueprint (NOT executed)
1. Obtain approval of separate staging RP/domain and free capacity; ensure DNS and deployment do not redirect any existing production accounts.
2. Allocate segregated disposable database/user, service identity and signing key, with no production data or shared signing keys. Apply reviewed migration only after backup/rollback and access-control review.
3. Bind the verified issuer and authorization adapters to real, independently validated identity/approver evidence. Keep feature flag default OFF; restrict test identities/hosts.
4. Activate only on authorized staging origin with HTTPS, strict Origin/CORS/CSRF, IP/rate controls, strong security headers, auditable operator notifications and no real customer access.
5. Enroll two physically distinct real FIDO2 devices, verify sign-in and recovery, failover, account disablement and monitoring. Preserve an emergency path that requires independent identity proof, not email-only bypass.
6. Exercise emergency OFF switch, session revocation, audit retention, restore and rollback. Confirm production account authentication is unchanged.
7. Obtain security reviewer and owner approval before merge, production, spending or real account enrollment.

### Release decision
**NO-GO for live authentication or staging deployment.** The code is intentionally inert and can be safely reviewed on a draft PR; hardware and independent operational approvals are still required. No background execution or deferred deployment is assumed.
