# NEO-PRESS-004 — Production readiness evidence, Noogle NEOpass bridge and recovery rehearsal

Date: 2026-11-02  
Release state: **DRAFT / NOT MERGED / NOT DEPLOYED / NO LIVE IDENTITY OR MEDIA CONNECTED**  
Dependent PRs: #1304 → #1305 → #1306 → current NEO-PRESS-004

## Implemented

- **Short-lived Noogle NEOpass exchange**: \`session-exchange.mjs\` accepts only ordinary unscoped, signed, unexpired Noogle/NEOpass session tokens (no other audience or scope) and rechecks live active membership AND a separate authoritative case-grant registry. A verified active newsroom member can receive a five-minute token restricted to audience \`neo-press\` and scope \`press:case-access\`. No token role or user header grants privileges; signed token cannot authorize an arbitrary case.
- **HTTP bridge**: \`POST /api/v1/press/session/exchange\` and **public data-free shell** \`GET /api/v1/press/login\` were added to the existing **disabled-by-default** press handler. The protected \`GET /api/v1/press/portal\` and all evidence/custody routes still require signed press tokens and case-level permissions. Browser UI can use the existing in-memory \`window.NeoPass.getAccessToken()\` contract from Noogle/NEO Edge, or an already-approved \`window.NeoPressAuth.getPressToken()\` provider. Tokens are requested per action, not persisted in localStorage, browser cookies or URLs.
- **Signed release-evidence manifest**: \`readiness.mjs\` checks independently signed Ed25519 control attestations, strict CI/deployment hash matching, expiry, and a minimum two independent reviewers. All eleven required controls must be covered. Outcomes are **BLOCKED** or **REVIEW_READY**, never **DEPLOYED** or automatically **GO**. Signed assertions verify key possession and integrity, not truth of the underlying infrastructure condition; real proof must be reviewed by an authorized independent reviewer.
- **Encrypted restore and key-rotation drills**: \`recovery.mjs\` restores ciphertext to a separate protected directory and verifies the GCM binding and original hash; stages re-encryption of an existing original using a distinct key into a separate protected directory. It does not overwrite the source, switch keys, revoke keys, purge old media or change live backups. Distinguish a local exercise from a certified external backup, tested disaster-recovery service or production KMS lifecycle.
- **External checkpoint witness adapter**: \`witness.mjs\` accepts a separately retrieved Ed25519-signed witness record under an independently provisioned public key. Checks include signed checkpoint hash, log root, time, separate witness identity, and independent retrieval. **The result is independently retrievable witness acknowledgment, NOT an immutable/public/on-chain anchor**. No witness endpoint, trust key or external publication has been configured.

## Required release evidence (not present by default)

All eleven control IDs must have recent, properly signed evidence from independently authorized reviewers tied to the intended deployment commit:

1. STACKED_PRS_REVIEWED
2. PRESS_SPECIFIC_CI
3. LEGACY_VAULT_ISOLATION
4. ENCRYPTED_STORAGE_AT_REST
5. KMS_KEY_ROTATION_DRILL
6. PRIVATE_BACKUP_RESTORE_DRILL
7. NEOPASS_SCOPED_ISSUER
8. PRESS_ROLE_REGISTRY
9. INDEPENDENT_CUSTODY_WITNESS
10. SECURITY_THREAT_REVIEW
11. JURISDICTION_COUNSEL_REVIEW

A valid signature alone is not evidence that someone actually reviewed production. No production readiness is certified without authorized human inspection of these source artifacts.

## Deployment / identity boundary

The NEO-PRESS modules remain on a draft feature branch; there is no authenticated Noogle host-to-press browser deployment or production bearer issuer yet. Noogle's in-memory NEOpass runtime may be reused only in a **trusted, same-origin** or explicitly authorized host, with access-scoped keys, trusted CORS, and a safe login handoff. The public login shell has no source records, credential scans, or case identifiers; login through Noogle is not automatically established merely because an HTML shell exists.

The prior legacy Evidence Vault HTTP service may permit unauthenticated access if its API token is unset. Keep press files in a wholly isolated database/volume; do not activate the old service to serve them.

No press credential image from the user was uploaded in this gate. Association issuer/current membership remains unverified. No website, DNS, database, backup provider, live identity credential, press association, Bitcoin anchor or social media publication was modified.

## Verification

Dedicated CI: \`node --test server/neo-press/*.test.mjs\`. Gate-004 tests cover authentic/forged Noogle tokens, wrong audience, inactive member, registry rejection, public shell without data, signed evidence and witness limitations, encrypted recovery and rotation, duplicate protection, wrong key and corruption cases.

## Release decision

**Hold** until all stacked PRs are reconciled, press-specific and repository-wide tests pass, production identity registry and isolated encrypted volume are certified, external witness retrieval is independently demonstrated, encryption keys/backup recovery are externally controlled, and counsel has reviewed the operating jurisdictions.

### Next gate: NEO-PRESS-005

Integrate a private production candidate runtime and test verified Noogle login end to end; deliver a professional case dashboard with read-only evidence catalog, scoped reporter intake and correction workflows. Do not connect real identity or publish sensitive material without approved isolation, certification and production evidence.
