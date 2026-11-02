# NEO-PRESS-003 — Encrypted original media, signed custody receipts and private press desk

**2026-11-02** · **DRAFT / NOT MERGED / NOT DEPLOYED** · stacked on NEO-PRESS-002, which is stacked on NEO-PRESS-001.

## Implemented in code

1. **Private original-media encryption** in server/neo-press/sealed-media.mjs:
   - AES-256-GCM with independent random 96-bit nonce per evidence item.
   - Authenticated associated data binds case ID, evidence UUID, original SHA-256, and envelope version.
   - Refuses incorrect 32-byte encryption keys, relative paths, a repository checkout path, symlinked components, insecure directory permissions, oversized media (8 MiB default), and duplicate writes.
   - Encrypted-only file on disk, exclusive create (mode 0600), fsync, no plaintext returns on verification.
   - Recomputes SHA-256 from actual uploaded original bytes before sealing and again after decrypting. Cryptographic integrity is not proof of original source truth, authenticity of issuer, or legal admissibility.
   - Key supplied by a separate trusted runtime; **no production key is provisioned and no real credential image has been uploaded**.

2. **Evidence Vault link**:
   - Adds press_media table to dedicated, nonshared press Evidence Vault SQLite schema.
   - Transactionally links only locally verified sealed originals to declared evidence and appends a hash-chain custody event.
   - Preflight requires a currently decryptable, hash-matching encrypted original alongside separate accuracy, privacy, and legal-risk reviewer approvals. Still marks readyForExternalPublication=false.
   - The existing "release-candidate" route from Gate 002 remains a **nonpublishing editorial candidate**, not a verified external-publication authorization. Use the new preflight for cryptographic validation.

3. **Signed export receipts, not live external anchoring**:
   - server/neo-press/checkpoint.mjs can request an Ed25519 signature through an injected independent signer callback.
   - Verification requires a trusted public key supplied **outside** the receipt; invalid signature and outdated custody heads fail match.
   - Each receipt explicitly marks externallyAnchored=false, published=false. An authenticated immutable third-party timestamp, separately controlled checkpoint service, or on-chain anchoring has **not** been connected. Signing by a service under the same operator is not independent public anchoring.

4. **Authenticated press HTTP route extension**:
   - POST /api/v1/press/evidence/:uuid/media — reporter assigned to case uploads a bounded binary original; digest must match metadata.
   - POST /api/v1/press/cases/:caseId/sealed-intake — restricted historical credential binary intake, generated metadata only, source classification LEAD and unverified current membership.
   - GET /api/v1/press/evidence/:uuid/release-preflight — assigned editor sees a nonpublic integrity check.
   - GET /api/v1/press/portal — responsive private desk, gated by signed scoped NEOpass token, active membership and press access registry.
   - The desk does not cache or embed bearer tokens or source media. A future supported NEOpass press-auth bridge must supply an ephemeral scoped token to its data-fetch controls; the UI is currently a **staged preview, not a live or directly navigable authenticated site**.
   - No raw source media is returned by API. No passwords/passkeys are stored in these modules.

5. **Automated tests**:
   - server/neo-press/media.test.mjs verifies case-binding, encryption, tamper detection, source-hash mismatch, restricted source handling, independent editorial approval, authorization, signed checkpoint validity/staleness, unauthorized portal access, and no-publication behavior.
   - Prior Gate 001 and 002 tests remain active in dedicated GitHub Actions workflow.

## Deployment blockers / nonclaims

- The **legacy Evidence Vault** HTTP service is *not safe for press media without remediation or strict isolation*: its bearer-token enforcement can be disabled by missing configuration and the reviewer can be supplied by a request header. NEO-PRESS-003 does not activate this legacy service.
- The press API is **disabled by default** and is not attached to an accessible public NEO runtime or domain. No external access to the original credential attachment in this chat was attempted.
- Real production media encryption key custody, key rotation, recoverability, backup/restore drills, isolated disk and database permissions, secure runtime secret injection, strong audit logging, and verified separate press role registry have not been demonstrated.
- The dedicated press SQLite DB is not itself encrypted. Do not deploy the current prototype to public or shared runtime storage; enable approved encrypted volume with independent backup and recovery evidence.
- Checksums and signatures do not prove professional press association affiliation/current status. This system neither certifies governmental authority nor promises legal reporter access beyond applicable law.
- There is no automatic upload to NEO Crown Chain, Bitcoin, press association, social media, or WordPress.
- Private portal is a gated HTML shell, not a complete live integrated newsroom login. No public URL was assigned.

## Required acceptance sequence

1. Merge/resolve stacked PRs NEO-PRESS-001 -> 002 -> 003, review code and complete security regression tests.
2. Remediate or isolate legacy Evidence Vault and prove that production ports/DB paths do not overlap.
3. Provide a certified secure press-only runtime with encrypted storage, independent backup restoration, key management/rotation, and least-privilege filesystem permissions.
4. Provision and validate a real NEOpass **press-scoped** issuer, signed audience and scope, active member registry, revocation, and authoritative case-specific newsroom roles.
5. Conduct penetration and threat-model review, audit deletion/reordering/replay, race conditions, denial-of-service, and media retention/deletion policies.
6. Commission jurisdiction-specific review of journalist access, recording, source protection and publication law.
7. Connect independent checkpoint publication and long-term verification; certify time provenance and retry/reconciliation.
8. Manually authorize only after reviewing final CI, data protection impact and production smoke results. Do not auto-publish or auto-issue credentials.

**Next Gate NEO-PRESS-004:** secure production readiness evidence, authenticated external checkpoints, encrypted volume + key rotation/backup recovery, and Noogle NEOpass press login integration. Gate 003 itself does not change DNS, financial state, deployed services, user credentials or actual press records.
