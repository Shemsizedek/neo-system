# NEO Key — Gate 7 independent security review readiness

**Project 144 · Issue #1434 · Draft PR #1435**  
**Status: REVIEW PACKAGE PREPARED, NOT INDEPENDENTLY APPROVED. NO RELEASE.**

## Scope of this gate
Gate 7 adds a non-routed Ed25519 staging session issuer, public-key-only two-approver bootstrap authorization service, PostgreSQL-backed single-use enrollment-approval receipts, and extra negative/rollback tests. All source is confined to the existing feature branch. No production session issuer, cloud database, domain, authentication route, passkey, Bitcoin transaction, OpenAI account or wallet was modified.

## Security decisions (implementation vs production contract)
| Boundary | Gate 7 artifact | Assurance / blocker |
|---|---|---|
| Identity | `neo-key-security/staging-issuer.mjs` | Ed25519-signed short-lived `neo-key-session` with strict issuer/audience/use/expiry and required external session-revocation callback. `authorizeSession` is a trusted injected callback, **not** a production identity-proofing implementation. |
| Account authority | `neopass-authority.mjs` | Requires issuer signature verification and live active-account registry; no executive role shortcut. Production NEO Pass currently has permissive token expiry and privileged registry-unavailable paths that are **not** trusted here. |
| First key | `bootstrap-approval.mjs`, `postgres-approval-store.mjs` | Exactly two Ed25519 signatures by distinct configured approver public keys on one subject/RP/origin/authorization-ref/expiry payload. Approver independence must be verified operationally; two keys under one person's control do not establish governance independence. |
| Approval use | `neo-key-postgres-store.mjs`, `sql/003_neo_key_credentials.sql` | One-use approval is consumed in the same transaction as challenge consumption + public credential insertion. Duplicate credential insertion rolls back approval and challenge consumption. Cannot register first credential without a valid unspent approval. |
| Additional keys | `staging-adapter.mjs` + `assertion-verifier.mjs` | Fresh signed `action=enroll` WebAuthn assertion from existing key; ordinary `authenticate` proof cannot enroll. |
| Recovery | Target-bound `action=recover` scoped challenge, asserted backup credential and transactionally protected revocation. | Replay, ordinary login, wrong target, wrong subject, revoked backup and last-key deletion denied by guarded contract; production recovery still requires independent review. |
| Public keys | COSE/PEM only | No FIDO private key, Bitcoin seed, hardware PIN, biometric template, or secret stored in source or blockchain. |

## Independent review checklist — all pending external reviewer sign-off
- [ ] **R1 / Identity cryptography**: audit Ed25519 key-management, secure signer loading, rotation/KID rules, token issuance authorization, clock skew, JTI storage, revocation, issuer/audience separation, expiry, error handling, algorithm confusion and JWT canonicalization.
- [ ] **R2 / Administrative governance**: verify distinct real approvers with separated credentials and authority; review issuance request authentication, request presentation, tamper-proof case ID, maker-checker separation, rapid revocation, notification and operator compromise.
- [ ] **R3 / WebAuthn**: audit `@simplewebauthn/server@14.1.0`, registration/attestation/UV, assertion signature and counter handling (including 0/0), resident credentials, browser origin/RP checks, cloning alerts, passkey sync and phishing defenses.
- [ ] **R4 / Authorization and persistence**: scrutinize transaction isolation, advisory lock assumptions, SQL grants, challenge/approval atomicity, expiration, one-use enforcement, rollback on exceptions, last-key protection, audit coverage and concurrent negative cases.
- [ ] **R5 / Staging exposure**: confirm never mounted in production; dedicated HTTPS RP, no real identities/keys in CI, rate limits, CSRF/origin controls, output sanitization, secrets-management restrictions, backup/restore, monitoring, retention, session invalidation and rollback.
- [ ] **R6 / Infrastructure and supply chain**: review immutable dependency lockfile, package scripts, npm provenance, dependency alerts, CI action pinning, build-rate-limit warning, least-privileged CI permissions, test-only service credentials.
- [ ] **R7 / Incident recovery**: rehearsal with lost primary, lost backup, both lost, compromised operator token, rollback after partial database failure, revoked registry user, network outage, signing-key compromise and corrupt backup.
- [ ] **R8 / Human hardware verification**: two genuine independently enrolled FIDO2 keys on an approved workstation, supported USB/NFC, hardware user verification, browser create/get, PIN prompt, removable key, and cross-device/origin checks.

**Review outcome:** No independent external or human security reviewer has approved this change. Leave all boxes unchecked until evidence is attached. No security-certification claim is authorized.

## Hardware discovery evidence (read-only)
On November 19, 2026, authorized Remote Desktop Commander returned `penguin` offline; SentinelX returned no connected hosts and `crown-node-001` offline. Consequently USB/NFC FIDO2 key inventory, hardware provenance, and real browser tests remain **unverified**. No purchase is authorized. When an approved device reconnects, inventory only; never export private keys, PINs, user biometric data, or hardware serial numbers into the public repo.

## Acceptance and test evidence to attach
- GitHub PR #1435 head and four GitHub Actions workflow results, including isolated Node.js security test and ephemeral PostgreSQL 16 end-to-end suite.
- Negative cases: forged signature, token revocation, expired/wrong-purpose login, registry outage, duplicate or tampered approval, wrong user/RP, one-use approval, normal-login-to-enrollment escalation, wrong-target recovery, replay, last-key preservation, and rollback after conflicting credential insert.
- Note that local simulated software FIDO authenticators, test Ed25519 keys and PostgreSQL CI service do **not** certify physical hardware or production issuer integration.

## Gate release and no-spend controls
- No merge until a named independent reviewer records verdict, evidence, open findings and fix verification.
- No production changes, live DNS, Render/Neon migration, WordPress login override, OpenAI/Daybreak enrollment, paid Vercel upgrades, key purchases, Bitcoin anchoring or real credentials.
- Future staging must be explicitly isolated, unmounted/default off, and first gated by an approved live issuer, protected approver credential custody, connection to a test RP, rate limits, crash/restart/replay tests, and owner approval.
- Fail-safe rollback is to leave `enabled=false` and the PR unmerged. For a future deployed staging environment, shut off the feature flag, revoke staging session identifiers, preserve audit events, verify a database backup, and use approved migration rollback procedures.

## Known deployment blocker
GitHub status URLs on earlier Gate 5/6 commits pointed to Vercel `?upgradeToPro=build-rate-limit`. Do not interpret Vercel build-rate limiting as an application compilation error or pay for capacity without explicit authorization.

**Next milestone:** connect a device for real FIDO2 testing; complete independent security review and an explicitly approved, isolated staging authority and enrollment API. No production launch in Gate 7.
