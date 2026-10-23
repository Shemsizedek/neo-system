# KI-016 — Authoritative NEOpass identity and production write certification

## Current decision: live KNOWINDEX writes remain BLOCKED

No new user data is being accepted by KNOWINDEX in production. The public Noogle index and approved World Library landing page remain read-only. KI-016 hardens the identity boundary and provides live-read-only probes and a protected, manually dispatched Cloud Run metadata audit; it does not create/modify databases, approve a reviewer, enable a write flag, migrate production data, or sign blockchain transactions.

## Observed runtime evidence (2026-10-23)

- GitHub main: KI-015 durable PostgreSQL adapter and isolated database restore tests merged in dbf5518547e032e15d5facb25b82b9ae72d72c29.
- Render service neo-platform-api-recovery is on main. An unauthenticated request to its KNOWINDEX contribution endpoint returned HTTP 503, error knowindex_writes_not_configured, writesEnabled false.
- Public NEO Platform API /api/v1/platforms returned HTTP 200; public GitHub Pages Noogle index returned HTTP 200.
- Render account has no verified dedicated KNOWINDEX production Postgres. noogle-connect-dev is an expiring dev database (2026-11-15), and neo-pads-production is owned by the NEO Pads workstream. Both remain untouched.
- GISS production code derives identity from NEO_PASS_JWT_SECRET and Firestore credentials in server/neo-platform-api/giss-production.mjs. Existing Cloud Run workflows can inspect GISS/NEOpass signing metadata, but production keys, actual issued token, member-role assignments and exact Cloud Run IAM status have NOT been certified from a live login session.
- The generic Google NEOpass session implementation contains a portal executive-bootstrap path based on signed session claims. KNOWINDEX moderation must never use those claims to grant reviewer privileges without registry evidence.

## Hardened code

- server/neo-knowindex/neopass-authority.mjs looks up an exact subject in the configured NEOpass registry on EACH request. It requires an active record and verified provider binding and ignores signed role/email claims.
- Curator and executive-admin role eligibility requires both an authoritative role on the active registry record AND separately approved operator subject allowlists. Empty allowlists give no reviewer privilege. Executive identity also requires the pinned executive email in the actual record; a token claim does not qualify.
- server/neo-knowindex/http.mjs strips all role-bearing JWT claims before asking the member authority. Even if the broader portal bootstrap service is injected, a signed role/email claim alone cannot make an unregistered subject a KNOWINDEX executive.
- server/neo-platform-api/giss-production.mjs now prepares a separate KNOWINDEX registry-backed authority without configuring any new write store or write enablement. No production startup argument creates a ledger or enables writes.
- scripts/ki016-live-readonly-smoke.mjs checks, without any credentials or writes: NEO API health, KNOWINDEX HTTP 503 fail-closed response, untrusted Origin HTTP 403, and the World Library public snapshot SHA-256.
- .github/workflows/ki016-knowindex-neopass-preflight.yml runs identity/HTTP/parser tests and the safe live HTTP smoke on PR/dispatch.
- .github/workflows/ki016-gcp-neopass-metadata-audit.yml is a separate, MANUAL-ONLY workflow using the existing protected holytemples-production environment and GitHub OIDC/Google WIF to inspect secret-binding metadata for neo-temple-giss. It prints booleans only, not secret contents or service identities. This workflow is NOT run by PR or push and MUST NOT be interpreted as a live login, role, or backup test.

## KI-016 closure criteria (not yet satisfied by code or CI alone)

1. Use approved secure credentials to inspect actual Cloud Run GISS signing reference, issuer and workload IAM. Verify the protected workflow report; do not publish token, principal IDs, client IDs or secret values in the project register.
2. Authenticate a real active NEOpass contributor and a DISTINCT curator, and confirm Firestore registry roles, revocation behavior, token expiry, issuer binding, signed claims ignoring, and verified OAuth provider subject mapping. No mock identities in the production pilot.
3. Provide a dedicated approved durable KNOWINDEX production database (not expiring dev or NEO Pads), with a restricted runtime role and inspected Postgres migration, backup schedule, restore point, RPO/RTO and rollback ownership.
4. Restore production backup safely into a separate isolated environment and validate the immutable audit chain and role isolation. The KI-015 disposable CI restore is useful but not production backup evidence.
5. With explicit authorization to turn on writes, run a minimal real contributor-to-independent-curator submission and withdrawal pilot, verify audit and rate limits, disable writes again, and verify public Noogle never indexes unreviewed submissions.
6. Keep external audit head hashes and alerts independent of the mutable database; rehearse emergency write disable without interrupting Noogle search.

## Proposed operator activation boundary

- The default NEO Platform API startup and GISS production startup do not enable KNOWINDEX writes.
- An operator-controlled, explicitly certified runtime must supply a persistent PostgreSQL ledger, a registry-backed KNOWINDEX authority with reviewed allowlists, a verified NEOpass issuer/secret binding and tested emergency disablement. None is provisioned by this gate.
- Approval of a contribution remains separate from release approval of public search content.
- No change to KNOWINDEX token assets, wallets, treasury, NEO Crown Chain signing or third-party licensed content rights.

## Success criteria for this PR

All NEO main CI and architecture checks green; identity boundary security tests green; live read-only smoke green; protected production metadata audit remains manual and cannot silently grant write permissions. Merge only if all CI passes, and record blockers on the KI-015/KI-016 project issue.
