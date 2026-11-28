# NEO Key — Project 144 Gate 10: custody hardening and staging-only readiness

**Date:** 2026-11-21  
**Tracking:** Issue #1434 / [draft PR #1435](https://github.com/Shemsizedek/neo-system/pull/1435)  
**Status:** **NO-GO for staging deployment and production.** Code and CI tests only.  
**Operational constraints:** No PR merge, no paid capacity, no device enrollment, no running HTTP service, no production identity or DB changes, no actual Bitcoin transaction.

## Verified source and review status

- Branch `feature/neo-key-gate2-prototype` was read from GitHub; PR #1435 was still draft/unmerged at the start of Gate 10.
- GitHub review inventory: **zero submitted pull-request reviews and zero review threads.** No authorized independent reviewer verdict has been furnished. The findings below are development audit findings, not independent certification.
- Authorized device discovery (read-only): Desktop Commander reports `penguin` **offline**; SentinelX reports **zero connected hosts**, `crown-node-001` **offline**. USB, NFC, vendor attestation, security-key model and real primary/backup key access cannot be verified.
- Previous Gate 9 security CI passed with synthetic test credentials and disposable PostgreSQL. Gate 10 changes require separate passing CI evidence before they may be described as tested.

## Gate 10 code-audit findings and remediation

| ID | Severity | Observation | Gate 10 change | Residual requirement |
| --- | --- | --- | --- | --- |
| NKEY-10-01 | High | The Ed25519 pair match check confirms only that the two supplied keys correspond. It does **not** bind the signer to a previously approved trust anchor. | `staging-issuer.mjs` requires a `trustedPublicKeyFingerprint` containing SHA-256 of the DER SPKI public key and rejects missing or mismatched fingerprints before any token issuance. | Trusted pin must come from separately authenticated custody records, **never from the untrusted signing key or user request**. Human custodian and key-vault controls not verified. |
| NKEY-10-02 | High | An externally mutable Map of approver public keys could expand or change who may sign after an approval service was created. | `bootstrap-approval.mjs` now takes a private snapshot of the allowed public-key Map; substitutions after initialization are ignored. Rotation requires a reviewed restart/reconfiguration. | Need separate real human identities, dual approval, vetted public-key registration, custody audit and tamper-evident change history. Distinct public keys do not prove human independence. |
| NKEY-10-03 | High | Passing software CI could be mistaken for an authorization to deploy. | Added Gate 10 observed-state test for the existing pure staging rehearsal; offline hardware and unsigned review cause `NO_GO`, and `deploymentAuthorized` always stays false. | Owner approval and independent review must be documented outside this test. |
| NKEY-10-04 | High | No available hardware verification or independent signed review. | Rechecked connected device inventory and PR reviews. | Physical workstation/browser/FIDO2 test and independent reviewer verdict **still blocked/unassigned**. |
| NKEY-10-05 | Medium | Preview deployment checks were previously failing with Vercel build-rate limits. | No deployment or paid upgrade attempted. | Verify capacity and staging deployment logs only after explicit approval and free capacity; do not infer code compilation errors from rate-limit status. |

## Trusted signer custody manifest (PRIVATE template; values unverified)

Maintain outside this public repository. Never put private keys, seed material, PINs, device serials or personally identifying details in PR comments.

| Required record | Minimum evidence | Actual status |
| --- | --- | --- |
| Issuer signing key fingerprint | Independently obtained SHA-256 DER SPKI public key digest + KID/key-generation event | **Unknown / no verified external record** |
| Issuer private key custody | Authorized custodian, vault/HSM policy, role grants, rotation and emergency revoke process | **Unverified** |
| First enrollment approver A | Verified person/role, distinct device/account and separately recorded approval | **Unverified** |
| First enrollment approver B | Different verified person/role and independently controlled public/private key | **Unverified** |
| Operator conflict rule | Maker-checker separation and disallow self-approval, same-owner approvals and emergency bypass | **Unverified** |
| Approval record | Subject, RP ID, HTTPS origin, case ID, expiry, once-only authorization ref, signatures, audit ID | Synthetic test only |
| Key replacement | Disconnected lost key, verified backup key, all sessions revoked atomically and account notification | Synthetic CI only |
| Disaster recovery | Both-keys-lost freeze, dual-authorized out-of-band identity verification, recovery delay, audit | **Not implemented/certified** |

## Staging-only readiness evidence

The NO-GO rehearsal has no network or filesystem side effects and cannot merge or deploy. This Gate 10 observation is recorded solely for review:

| Gate | Evidence | State |
| --- | --- | --- |
| Dedicated isolated HTTPS RP | No provisioned origin validated | BLOCKED |
| Dedicated least-privilege staging DB and rollback | Ephemeral CI PostgreSQL is not an authorized staging environment | BLOCKED |
| Issuer custody | Fingerprint validation implemented; external trust pin and custody missing | BLOCKED |
| Two human approver custodians | Crypto signed fixtures; no human identities confirmed | BLOCKED |
| Live NEOpass identity trust | Unmounted injected test callbacks; live issuer contract not certified | BLOCKED |
| Independent review | No GitHub PR review submissions found | BLOCKED |
| Primary and backup physical FIDO2 | All known remote hosts offline | BLOCKED |
| Recovery/rollback | Isolated signed software-key and PostgreSQL tests; operational incident drill absent | PARTIAL |
| Monitoring, rate limits, abuse control | No deployed endpoint or real telemetry | BLOCKED |
| Owner staging authorization | No operational release requested or granted | BLOCKED |

**Readiness decision: NO_GO.** Even if evidence rows later become complete, the pure rehearsal can only return `INDEPENDENT_RELEASE_REVIEW_REQUIRED`; it cannot authorize or perform a release.

## Required independent reviewer acceptance

- [ ] Name reviewer independent of implementers and document code commit, threat model, scope, date, and conflicts of interest.
- [ ] Verify externally pinned issuer fingerprint source, keypair custody, KID rotation, token aud/iss/use/exp/JTI revocation, key loss and vault downtime.
- [ ] Verify immutable allowlist, distinct approver custody, maker-checker policy, signed request identity, expiry, one-time approval, denial and audit.
- [ ] Verify WebAuthn verifier policy, UV, RP/origin, authenticator counters, replay, registration, recovery, revocation, credential/device backup.
- [ ] Verify PostgreSQL statement parameterization, transaction locks, zero-counter behavior, audit rollback, session revocation, backup restoration, and least privilege.
- [ ] Verify CI dependency lockfile, workflow permissions, secret handling, supply-chain exposure, runtime error handling, rate limits, CSRF/CORS, monitoring.
- [ ] Execute genuine browser `navigator.credentials.create/get` with **two physically distinct FIDO2 keys** on a separately approved staging RP.
- [ ] Record severity, evidence, remediation verification, unresolved residual risk and an independently signed verdict.
- [ ] Obtain explicit owner approval **for isolated staging only** before creating any new resource, enabling a public endpoint or enrolling any real credential.

**Independent reviewer verdict: NOT RECEIVED.** Gate 10 fixes are internal engineering controls only.

## No-spend staging rehearsal and rollback

1. Confirm the PR remains draft/unmerged; isolate test-only data/keys and avoid production trust endpoints.
2. Run repository GitHub Actions using existing resources, including `npm ci` and disposable PostgreSQL 16. Capture head SHA, test counts and failures.
3. Execute the pure rehearsal tests. Expect `NO_GO` for the actual state. Assert `actionsPerformed=[]`, `deploymentAuthorized=false`.
4. Review CI logs for synthetic test-only key material and ensure no real credentials, JWTs, private signing keys or user identifiers are logged.
5. Leave staging adapter unmounted and feature flag default OFF; no deployment or DB migration is executed.
6. If an authorized workstation reconnects, perform **read-only device identification first** and only begin FIDO2 enrollment after explicit controlled isolated-test approval; never interpret a generic USB flash drive as FIDO2.
7. For any future approved staging exercise, have a documented rollback: stop endpoint, invalidate staging sessions, preserve auditable events, restore verified test-only DB snapshot, and ensure production authentication unchanged.

## Evidence links

- [PR #1435](https://github.com/Shemsizedek/neo-system/pull/1435)
- [Gate 9 dossier](./NEO-KEY-GATE9.md)
- `neo-key-security/staging-issuer.mjs`
- `neo-key-security/bootstrap-approval.mjs`
- `neo-key-security/staging-issuer-approval.test.mjs`
- `neo-key-security/staging-release-rehearsal.test.mjs`

**Gate 10 CI evidence:** Update the PR description with the exact commit and GitHub Actions run after checks finish; do not substitute a prior gate's result.

**Final no-go assertion:** No secure authentication service, browser passkey enrollment, public staging, real Daybreak/ChatGPT authentication integration, or Bitcoin anchoring has been activated in this gate.
