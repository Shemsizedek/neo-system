# Project 144 — NEO Key Gate 4 certification gate

**DRAFT ONLY — no login routes, tokens, wallet signing, on-chain writes, production changes, or user key enrollment.** Advances #1434 and draft PR #1435.

## What is implemented
- A completely isolated @simplewebauthn/server **14.1.0** registration adapter under `neo-key-security/`. The library validates signed WebAuthn registration ceremony structures, expected RP ID and HTTPS origin, challenge, UP/UV, and ES256-only algorithm policy. COSE public keys are converted to P-256 SPKI/PEM for the Gate 3 credential-store contract.
- Positive synthetic WebAuthn *none-attestation* registration vector and tests for wrong challenge, origin, missing UV, unsupported algorithm, malformed attestation and forged success flags. **None-attestation validates ownership of the new keypair, not hardware provenance or manufacturer certification.**
- PostgreSQL transaction policy requires **zero** active keys for a verified operator first-key bootstrap and **at least one** active key for an independently verified existing-passkey additional enrollment. Both are checked inside the subject-locked transaction. `authorization_ref` is unique across registration challenges.
- Backup assisted revocation now requires a fresh scoped assertion from a distinct key with trusted verifier-supplied `assurance='webauthn-verified'`, matching RP/origin, purpose and verification time (within 60 seconds). The stored credentials must still be active and owned by the same subject.
- Dedicated GitHub Actions workflow uses an **ephemeral PostgreSQL 16 service inside the runner**, never a user-owned Neon/Render/Vercel database. It creates test-only tables and tests concurrent challenge consumption, first-key privilege separation, duplicate bootstrap rejection, two-key revocation races, and last-key preservation.

## Verification and constraints
- Isolated dependency package contains an exact direct dependency pin; dependency graph lockfile is **not yet committed**. Lock and review transitive dependencies before merging or shipping.
- Synthetic software credentials and CI-local PostgreSQL are not physical FIDO2 devices, production session authority, or an end-to-end browser test.
- `verifyExistingAssertion`, `resolveSessionSubject`, and `authorizeEnrollment` remain **trusted injectable boundaries**, not production NEOpass integrations. No route binds the new registration adapter to the live enrollment service. First-key bootstrap must be operator-verified with audit and throttling; do not accept a client-provided approval string.
- PostgreSQL migration is **not applied** to Render, Neon or any user-owned database. It is applied only within the disposable CI service for testing.
- Review notification, privileged account emergency recovery, phishing-resistant session step-up, challenge rate limiting, multi-region concurrency, database backup restoration and hardware authenticator testing before activation.
- The current Gate 2 assertion verifier emits a `device-bound` claim even when hardware provenance is not proven; do **not** promote this claim to authorization.

## Vercel check investigation
GitHub commit statuses / the Vercel bot's PR summary show **three failed preview projects** (`neo-gateway`, `neo-gateway-v1`, `neo-system`) and successful `neo-city-proxy`, `neo-counter-backend` (plus a broader Vercel deployment status). The failure pattern existed on the pre-Gate-4 branch and is not enough to identify a cause. Vercel's status links require authenticated build-log access. Do not claim the failures are caused by this branch or change project settings based on guesses. Inspect Build Logs and compare root-directory, build command, runtime, install command, missing variables, and failed logs before remediation. A dedicated Vercel connector would provide authenticated inspection if connected.

## Release blockers
1. Add deterministic dependency lock, SCA checks and versioning review.
2. Wire the audited registration verifier to *only* authoritative NEOpass session, registration-approval and transactional storage interfaces.
3. Implement maintained-library authentication assertion verification (including sign counter updates and zero-counter behavior) before declaring backup proof end-to-end.
4. Test real FIDO2 hardware primary and recovery devices, backup loss, stolen sessions and atomic cross-worker replay.
5. Verify Vercel deployment errors; obtain security review, deployment plan and rollback before changing production.
6. Keep blockchain audit anchoring optional and separate; never write secrets or identifying credential records on Bitcoin.
