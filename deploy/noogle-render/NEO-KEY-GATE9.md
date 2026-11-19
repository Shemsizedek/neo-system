# NEO Key — Project 144 / Gate 9 Independent Security-Review Evidence Dossier

**Pull request:** [#1435](https://github.com/Shemsizedek/neo-system/pull/1435)  
**Source branch:** `feature/neo-key-gate2-prototype`  
**Review status:** PACKAGE PREPARED — **NO INDEPENDENT REVIEW OR SIGN-OFF RECEIVED**  
**Release status:** **NO-GO** for production, network-accessible staging, or real identity/key enrollment  
**Authorized actions:** branch-only code/tests, CI-local disposable PostgreSQL, read-only hardware inventory, documentation  
**Prohibited this gate:** merge, spending, production changes, paid Vercel upgrade, live user account modification, real BTC transaction, private key disclosure.

## 1. Verification boundaries

- Crypto fixtures, temporary Ed25519 signers, CI-only PostgreSQL and `connect.example.test` are synthetic. A passing run does **not** prove custody of real hardware, human reviewer independence, secure operator identity proofing or operational authorization.
- This repository is public. Never upload issuer private keys, signer seeds, recovery material, security-key serials, biometric information, real account identities, internal infrastructure topology or passwords.
- The reviewed implementation remains **unmounted**: no HTTP handler, running authentication service, access token for NEO production, or cloud deployment.
- Claims of independence, physical possession, certification or operational readiness require separately collected evidence from authorized human operators/reviewers, stored outside this public repository.

## 2. Code evidence and security boundaries

| Evidence | Code | Reviewer focus |
|---|---|---|
| Ed25519 issuer | `neo-key-security/staging-issuer.mjs` | Exact issuer/audience/token_use, short expiry, durable JTI registration, active-session lookup, and matching signer/verifier pair before issuance |
| Session allowlist | `neo-key-security/postgres-session-store.mjs` | Subject/JTI/expiry binding, duplicate refusal, token revocation, fail-closed DB outage |
| Approval signatures | `neo-key-security/bootstrap-approval.mjs` | Two distinct public keys and aliases, canonical subject/RP/origin/expiry payload, issuer-independent approval custody |
| Approval persistence | `neo-key-security/postgres-approval-store.mjs` | Scoped, one-use signed approval references; no private approval keys |
| Atomic registration | `neo-key-postgres-store.mjs` | Subject advisory lock; consume challenge and approval + insert public credential + audit in one transaction |
| Registration crypto | `neo-key-security/registration-verifier.mjs` | SimpleWebAuthn ES256 registration, UV, RP/origin binding, COSE public key only |
| Assertion crypto | `neo-key-security/assertion-verifier.mjs` | Signature check, UV, challenge scope, RP/origin, monotonic/zero counter, exact recovery target |
| Recovery | `neo-key-lifecycle.mjs` + `neo-key-postgres-store.mjs` | Separate active backup; preserve last key; revoke all subject NEO Key sessions atomically with key revocation and audit |
| Staging composition | `neo-key-security/staging-adapter.mjs` | Requires explicit enable and injected trusted dependencies; no live route/session grants |
| Schema | `sql/003_neo_key_credentials.sql` | **CI-only design**, NOT an approved production migration |
| Rehearsal | `neo-key-security/staging-release-rehearsal.mjs` | Pure function, no I/O or deployment capability; missing evidence is NO-GO; complete self-asserted input still needs independent review |
| CI | `.github/workflows/neo-key-prototype-ci.yml` | Read-only permissions; `npm ci` pinned lockfile; synthetic signed WebAuthn; disposable loopback PostgreSQL 16 |

## 3. Gate 9 review findings and disposition

| ID | Severity / risk | Finding | Gate 9 action | Status |
|---|---|---|---|---|
| NKEY-09-01 | High | Signer/verifier Ed25519 keys may be mismatched at configuration | Prove signer/verifier pair via local signature challenge on startup, fail closed on mismatch | Code fixed; CI verification pending recording |
| NKEY-09-02 | High | Recovering a lost credential previously left already-issued sessions active | Atomically revoke all subject staging-session JTIs with recovery audit and credential revocation; rollback all if session update fails | Code fixed; CI verification pending recording |
| NKEY-09-03 | High | Recovery may partially persist if session revocation fails | Disposable PostgreSQL failure-injection trigger proves credential, session and audit roll back as a unit; retry after repair | Test added; CI verification pending recording |
| NKEY-09-04 | High | Distinct signing keys are not proof of independently controlled human operators | Record custody, approval identity, conflict policy and maker-checker chain requirements | **Open: external governance evidence needed** |
| NKEY-09-05 | High | Identity-proofing and protected staging issuer signer are injected rather than operationally wired | No endpoint mount, credentials, signer provisioning or live staging activation; require reviewed issuer/KMS/HSM lifecycle | **Open: no certified issuer** |
| NKEY-09-06 | High | Real primary/backup hardware authenticity, PIN/UV and physical recovery untested | Read-only host discovery; maintain test matrix | **Open: both hosts offline** |
| NKEY-09-07 | Medium | A green CI run could be misreported as permission to stage/deploy | Added non-executable fail-closed rehearsal: NO-GO until evidence complete; even then `INDEPENDENT_RELEASE_REVIEW_REQUIRED` | Rehearsal added; external approval pending |
| NKEY-09-08 | Medium | Vercel checks blocked by account build-rate limit | Continue disposable CI-only test, avoid spending or preview build bypass | **Open: Vercel capacity** |

These findings are authored internal engineering observations, **not** an independent penetration test or external certification.

## 4. Required signer custody dossier — PRIVATE, not GitHub

The following must be supplied by real authorized custodians and reviewed outside the public repository before any staging activation:

- Identity and authority of **issuer signing-key custodian**, distinct from any application administrator where practical; secure vault/HSM access-control policy and nonexportable key preference.
- Public-key fingerprint and KID mapping, creation/activation/deprecation dates, key-rotation and emergency revocation procedure. **Never copy private key files or seed material into this report.**
- Two separate enrollment approvers with demonstrated unique ownership/custody of physically or logically separate signing credentials; second-person conflict of interest check and separate maker/checker audit trail.
- Source of first-key registration request, issuer-validated target identity, evidence freshness, approval expiry, one-time reference, notification and safe denial workflow.
- Written policy for lost both keys: locked account, independent multistep identity checks, dual approval, timed hold, incident log, and owner notification; never email-only or role-based bypass.
- Independent security reviewer assignment and evidence of reviewer not authoring/approving their own findings.

All unprovided fields are **UNKNOWN**, not approved.

## 5. Physical FIDO2 verification (read-only status)

On November 19, 2026:
- Desktop Commander `penguin`: **offline**.
- SentinelX `crown-node-001`: **offline**, zero connected hosts.

No authenticated USB/NFC device scan was possible. Do not claim any device is present, FIDO2 compatible, genuine, or enrolled. If an approved host reconnects, first inspect devices read-only, verify test owner/consent, then schedule an isolated physical-key/browser ceremony with no production accounts.

Required evidence: primary and distinct backup hardware, platform/browser matrix, OS UV/PIN behavior, attestation policy, challenge replay protection, revoked-key denial, full account recovery, and power/device-loss rehearsal. Record only non-sensitive test results in the PR.

## 6. Isolated staging release rehearsal (NO deployment)

Entry command in existing PR CI:
```sh
npm ci --prefix deploy/noogle-render/neo-key-security --ignore-scripts --no-audit --no-fund
node --test deploy/noogle-render/neo-key-security/staging-release-rehearsal.test.mjs
```
The rehearsal is a pure decision function with NO network, file writes, token grants, service provisioning or host controls. Its default output is `NO_GO`; no amount of self-reported input ever changes its `deploymentAuthorized:false`. Even a completed checklist yields `INDEPENDENT_RELEASE_REVIEW_REQUIRED` and requires owner approval through a separate controlled process.

**Go/no-go items:** isolated RP, segregated database and IAM, issuer custody, two independent approvers, live NEO Pass trust, independent review, two physically tested FIDO2 keys, recovery and rollback, monitoring/rate controls, and explicit owner approval.

**No-go decision:** Device offline, reviewer unsigned, signer custody unverified, unprovisioned staging RP and identity integration; therefore **NO-GO**.

## 7. Independent reviewer checklist (all unverified until endorsed)

- [ ] Reviewer identifies scope, threat model and code version/commit; independence and conflicts recorded.
- [ ] Issuer KID/key-pair custody, EdDSA algorithm enforcement, session/JTI revocation and rotation reviewed.
- [ ] Public approver key enrollment, two-person control, signer independence, request provenance and approval revocation reviewed.
- [ ] WebAuthn registration/assertion/recovery, target/action binding, device UV, replay, session invalidation and last-key protection reviewed.
- [ ] PostgreSQL concurrency, ACL/RLS/TLS, atomic rollback, backup encryption, retention, disaster-recovery and migration downgrade reviewed.
- [ ] Rate limiting, CSRF, CORS/origin, audit alerting, subject suspension and server access boundary reviewed.
- [ ] Real FIDO2 device and browser matrix executed on isolated test RP with two independent authenticator devices.
- [ ] No secrets in public GitHub artifacts, CI logs, npm lock, test snapshots or deployment settings.
- [ ] Reviewer submits signed finding summary, evidence links and remediation verification.
- [ ] Owner explicitly approves future **isolated staging only** after findings are closed; production remains separate.

**Reviewer:** Unassigned  
**Independent security verdict:** NOT ISSUED  
**Human signer governance verdict:** NOT ISSUED  
**Physical FIDO2 certification:** NOT TESTED  
**Staging deployment authorization:** NOT GRANTED  
**Release outcome:** **NO-GO**

## 8. Source-controlled rollback conditions

- On any security regression: leave PR draft/unmerged and the adapter unmounted. No rollback of production is needed because no production changes were made.
- Future controlled staging must have a default-off feature flag, separately permissioned/test-only DB, a documented way to revoke all staging sessions, verified backup restore, and an independent owner release decision.
- A database trigger-induced session-revocation failure must roll back the entire lost-key recovery transaction; a failed audit insert must likewise roll back key revocation. Neither test may touch real user accounts.

## 9. Links and reproducible evidence

- [Draft PR #1435](https://github.com/Shemsizedek/neo-system/pull/1435)
- [Gate 8 evidence](./NEO-KEY-GATE8.md)
- [Gate 9 software tests](./neo-key-security/staging-release-rehearsal.test.mjs)
- [Gate 9 PostgreSQL tests](./neo-key-security/postgres.integration.test.mjs)
- **Exact Gate 9 CI head, run ID and test counts:** capture only after GitHub Actions completes, and update PR description. A past green run cannot certify a newer commit.

**No real FIDO2 key purchase, OpenAI or Daybreak account change, production action, infrastructure spending, deployment, merge or Bitcoin transaction is part of this gate.**
