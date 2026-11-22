# NEO Key — Project 144 Gate 11: independent review handoff and staging readiness

**Date:** 2026-11-21  
**Tracking:** Project 144 / issue #1434 / [draft PR #1435](https://github.com/Shemsizedek/neo-system/pull/1435)  
**Release decision:** **NO-GO**, including network-accessible staging and any real account enrollment.  
**Constraints:** Production unchanged, zero new spending, PR stays draft and unmerged.

## 1. Verified operational inventory

- `penguin`: offline in authorized Desktop Commander device inventory. **No local USB/NFC scan** could occur.
- `crown-node-001`: offline in SentinelX; **zero connected hosts**. No evidence of a physical FIDO2 key on either workstation.
- GitHub PR #1435: draft and unmerged at Gate 11 inspection. Zero submitted independent reviews and zero review threads.
- `.github/CODEOWNERS` names only `@Shemsizedek` for select control-plane paths, and explicitly says code-owner review is advisory until branch protection. This is **not an independent security reviewer assignment** for NEO Key.
- No reviewer username with demonstrated independence, qualification and repository access was available from the reviewed records. **Do not invent an assignment or claim a review was requested.**
- Recent Vercel status checks indicated account build-rate limiting; no upgrade or deployment is authorized or attempted.

## 2. Independent security reviewer assignment — handoff ready, not assigned

The designated project owner should identify a real reviewer who is not an author of the PR, not a NEO Key signer custodian, not one of the bootstrap approvers, and not the person responsible for approving the release.

### Proposed review assignment contract

**Role:** Independent WebAuthn / identity / cryptographic security reviewer.  
**Qualifications:** Practical FIDO2/WebAuthn registration and assertion verification, Ed25519 JWT trust, PKI key custody and rotation, PostgreSQL transaction isolation and application security.  
**Scope:** Source at a fixed commit, threat model, critical-path tests, release/rollback plan, leaked-secret and authorization checks.  
**Required evidence:** Reviewer GitHub identity, approval authority, independence/conflict declaration, review submission referencing an exact commit, finding IDs/severity/reproduction and proof of fixes.  
**Approval rule:** A review from the author or signer custodian must NOT count as independent; an automated CI success must NOT count as human approval.  
**State:** **Unassigned / no review submitted.** PR stays draft; no reviewer request is sent to an unverified person.

Reviewer should specifically inspect:
1. The separately trusted issuer fingerprint source and Ed25519 key lifecycle (custody, rotation, compromise and revocation).
2. First-key approval provenance, physical and organizational separation, conflict-of-interest checks, operator identity revocation, receipt reuse.
3. Live NEOpass issuer and active registry trust (strict expiry/issuer/audience/purpose, no privileged fallback).
4. WebAuthn RP/origin, signature/UV, one-use challenges, zero-counter logic, recovery action/target binding, and both-keys-lost policy.
5. PostgreSQL SQL privileges, concurrency, audit/session rollback atomicity, database snapshots and rate limiting.
6. Secrets/logs, public GitHub files, dependency lockfile, staging origin, CI permissions and default-off activation.

## 3. Gate 11 engineering finding register

| ID | Priority | Finding | Gate 11 disposition |
| --- | --- | --- | --- |
| NKEY-11-01 | High | Two distinct signatures do not establish two independent, active *human custodians*. | `bootstrap-approval.mjs` requires a trusted `verifyApproverCustody` callback for each signer, checked against the allowlisted public-key fingerprint, active status, authorized role, identity and nonconflict. Reject same person ID, self-approval and revoked signer. **Contract implemented; external custody registry NOT connected.** |
| NKEY-11-02 | High | Mutable approver records or a registry outage could silently authorize a disallowed signer. | Existing signer-map snapshot retained; new negative tests cover wrong fingerprint, role, revoked status, conflict, same operator and lookup outage. **Software tests pending current-commit CI evidence.** |
| NKEY-11-03 | High | Independent review not received. | Reviewer selection criteria and fix-verification workflow documented. **Open, unassigned.** |
| NKEY-11-04 | High | Physical primary and backup FIDO2 device certification impossible on offline hosts. | Rechecked authorized inventory; **blocked**, no device claims or enrollment. |
| NKEY-11-05 | High | Real signer custody and operational identity proofing remain injected test contracts. | **Open.** Server-side trusted callback must be bound to independently authenticated custody records; an application request claim is insufficient. |
| NKEY-11-06 | Medium | Green CI can be mistaken for staged release permission. | Rehearsal stays pure and returns `NO_GO` until external evidence; `deploymentAuthorized=false` regardless. **Do not deploy.** |

### Important residual trust boundary

The new `verifyApproverCustody` callback is only a contract. Its returned record must originate from a permissioned, independently authenticated authority with distinct human identities and current signer enrollment. **Synthetic test records do not certify physical human custody**. The callback must never trust browser JSON, caller-controlled roles or email alone.

## 4. Verified/blocked staging readiness matrix

| Gate | Observation | State |
| --- | --- | --- |
| Source/CI cryptographic tests | Software-generated credentials and disposable PostgreSQL; check current head after CI | PARTIAL |
| Independent reviewer | No submitted reviews; no verified reviewer assignment | BLOCKED |
| Signer custody | Key pinning and custody lookup contract; no real external custody authority | BLOCKED |
| Dual human approvers | Synthetic test identities only | BLOCKED |
| Physical primary/backup FIDO2 | Both remote hosts offline | BLOCKED |
| Real NEOpass issuer | No approved live `neo-key-session` trust integration | BLOCKED |
| Isolated HTTPS staging RP/DB | No authorized network-reachable staging environment provisioned | BLOCKED |
| Logging/rate/incident ops | API not mounted; operational controls unverified | BLOCKED |
| Owner approval to stage | No staging deployment approval given | BLOCKED |
| Vercel capacity | Previously rate-limited preview builds | BLOCKED |

**Gate 11 decision: NO-GO.** No staging resources, HTTP endpoints, identity tokens for real accounts, genuine key enrollment, Bitcoin transactions, paid services or production settings may be modified in this gate.

## 5. Read-only FIDO2 readiness when an authorized host reconnects

1. Confirm the host is authorized and online; inspect USB/NFC device *capability* read-only.
2. Distinguish plain flash storage, USB-lock software and actual CTAP2/FIDO2 authenticator hardware.
3. Record browser/OS test capability and two available physically distinct keys without exporting PIN, serial, seed or private information to public GitHub.
4. Request and receive explicit approval for an **isolated test identity and RP**, then test WebAuthn registration and authentication, primary + backup, loss/revocation and recovery.
5. Preserve production accounts and existing login paths. Never use a USB flash-drive key file as a replacement for phishing-resistant FIDO2.

## 6. Reviewer closure procedure

Maintain a reviewer-owned findings list with: ID, severity, affected file/range, reproducible steps, risk, owner, remediation commit, independent retest, closure decision and timestamp. Treat open critical/high findings or missing evidence as **NO-GO**. Do not mark a finding closed based solely on developer assertion or CI success. Attach the actual submitted GitHub review and any private signed custody evidence through approved secure channels, not the public repo.

## 7. No-spend rollback

The staging adapter is currently unmounted. Leave the PR draft/unmerged, feature gate OFF and CI test-only. There is no production deployment to roll back. A future authorized isolated staging operation must have a documented disable switch, test database snapshot, session invalidation plan, alerting and owner-controlled rollback before activation.

## 8. Evidence references

- [Gate 10 custody assessment](./NEO-KEY-GATE10.md)
- [Gate 9 evidence dossier](./NEO-KEY-GATE9.md)
- `neo-key-security/bootstrap-approval.mjs`: independent custodian contract
- `neo-key-security/staging-issuer-approval.test.mjs`: negative test evidence
- `neo-key-security/postgres.integration.test.mjs`: disposable database chain
- `neo-key-security/staging-release-rehearsal.mjs`: non-executing NO-GO gate
- [Draft PR #1435](https://github.com/Shemsizedek/neo-system/pull/1435)

**CI evidence for Gate 11:** attach exact commit and passing test totals to the PR only after the current GitHub Actions run has concluded. A previous green Gate 10 run is not a Gate 11 certification.

**Reviewer verdict:** NOT RECEIVED  
**Human signer custody verified:** NO  
**Real FIDO2 hardware verified:** NO  
**Staging activation:** NOT AUTHORIZED  
**Production change:** NONE  
