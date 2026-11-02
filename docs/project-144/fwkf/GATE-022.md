# Project 144 — FWKF Gate 022: database-connected private Forum API

**Date:** November 1, 2026 (US Eastern; cloud execution logs November 2 UTC)
**Outcome:** Live and tested staging **read-only PostgreSQL API**; protected member query wired to Neon Auth JWT and explicit database membership; public Forum signup/posts remain closed.

## Project register
| Workstream | Status | Owner / decision |
| --- | --- | --- |
| Free World Knowledge Foundation & World Café | Live, unchanged | Existing hosting, WordPress and Neon custom-domain chain |
| Free World Knowledge Forum private alpha | Database-connected read API deployed | NEO Forum product, test branch only |
| Forum identity | Managed Better Auth provisioned in staging; **no actual login test yet** | Test identity owner not yet supplied |
| Forum member approval | Query, policy and client state implemented; **no test member** | Moderator/administrator approval required |
| Forum Q&A, replies, votes, moderation | Source modules and simulated tests; **not deployed as write routes** | Explicit review before production |
| Local physical Knowledge Cafés | Separate proposed operations workstream | Locations not represented as operational |

## Verified environment (do not confuse with production)
- Neon project `purple-waterfall-10955254` (`neo-twlf-forum`), staging branch `br-misty-sun-b850yi7t` (`fwkf-forum-g020-staging`).
- Staging branch has six topic communities all **draft**, and previously confirmed zero Forum members, Auth users, posts and reports. Live GET on published communities confirms no active public entries.
- Existing main branch `br-young-brook-b8quup3r` still returns **Auth not enabled**; it was not modified. Existing World Leaders Forum and World Café hosting unchanged.
- The isolated Neon staging branch expires `2026-11-15T23:00:00Z` unless extended intentionally. No paid plan upgrade or new fee authorized.

## Delivered cloud API
- **New Neon Function:** `fwkfdata`, **deployment ID 1 / completed** in staging.
- **HTTPS base:** `https://br-misty-sun-b850yi7t-fwkfdata.compute.c-14.us-east-1.aws.neon.tech/`.
- **Source:** `apps/fwkf-forum/functions/data/index.mjs` and `handler.mjs`; built with bundled `pg` and `@neon/functions` using GitHub Actions, not Penguin. The existing `fwkfalpha` remains separate as rollback/diagnostic baseline.
- `GET /health`: 200, no registration or posting.
- `GET /communities`: 200, **actual PostgreSQL SELECT** restricted to `status='active' AND visibility='public'`; response empty because all six communities remain draft.
- `GET /me`: requires valid Neon Ed25519-signed JWT with branch JWKS, exact Auth origin issuer/audience, expiry and subject. After signature verification, queries `fwkf_forum.members.auth_subject=$1` using parameters. Missing/inactive membership returns 403; anonymous requests return 401.
- Every POST, including posting and moderation, returns 405. Origin/CORS is limited to `https://worldcafe.holytemples.org`. Responses are no-store and expose no private subject or token. HTTPS client test verified anonymous GET 401.
- Pool uses provider-injected staging `DATABASE_URL`; the Function can execute read-only SQL but dedicated least-privilege database credentials/roles are **not yet implemented**. Do not claim production-grade read-only database role isolation.
- Builds: `.github/workflows/fwkf-forum-data-gate.yml`, source tests `apps/fwkf-forum/tests/data-api.test.mjs`. Cloud build/run **41368062885 passed**; source compiled with esbuild as Node 24 ESM and deployed from the verified bundle. No credentials are embedded in the public code or the CI artifact.
- Independent HTTPS readback: `/health` HTTP 200, `/communities` HTTP 200 and empty, `/me` HTTP 401. Separate live smoke workflow `FWKF 022 live staging API smoke tests` verifies 8 GET/CORS/POST-denial checks without credentials or mutations.

## Browser identity integration (not publicly deployed)
- Updated `apps/fwkf-forum/web/member-session.mjs` to pin the new exact staging API host; accepts only verified member roles returned by the API and **posting=false**.
- Neon Auth sign-in alone is insufficient: a signed-in identity not in the Forum member registry gets 403 and a clear `pending_approval` state. No account is auto-promoted and no JWT user-supplied role is trusted.
- Updated `alpha-login.mjs` to distinguish approved from pending membership; sign-in UI remains private **unbundled source only** and no registration form is exposed.
- Tests cover signed-out, unauthorized, membership-pending and approved read-only cases using mocked sessions. **A real Neon user signing in/out or restoring their session has not been tested.**

## Privacy and operational constraints
- No content from Project 144 chats, private users, simulated discussions or knowledge resources was published as real Forum content.
- No physical café operation, token issuance, investor services or other live sites changed.
- The Forum's public preview remains informational; it does not collect registration data or enable posting.
- Before inviting testers, establish a real controlled identity, access approval, account provisioning process, content moderation personnel, durable rate limits, least-privilege DB role, abuse policy, backup and recovery.

## Next milestone — FWKF Gate 023
1. Obtain an authorized controlled test identity (real email under user control) and test Neon Managed Auth browser sign-in, sign-out and session renewal; do not fabricate a personal mailbox.
2. Bind a verified auth subject to one moderator-approved `fwkf_forum.members` record and confirm signed-in unauthorized vs approved access through live `fwkfdata`.
3. Create a dedicated least-privilege staging DB role and token-routed mutation API with explicit preview write disable until tests pass; add rate limiting, durable audit, content rules and rollback.
4. Test real private question -> moderation -> approved feed -> reply -> vote -> report with two separately authenticated users, access-denial checks and backup/restore.
5. Consider time-bound controlled beta only after all acceptance checks; maintain full independence from Penguin.

## Final security and live test receipt

- GitHub Actions `FWKF Forum 022 staging database gateway build` run **41368062885** concluded **success**; this built the dependency-bundled `pg` Function deployed to Neon staging.
- Live cloud smoke run **41368448912** concluded **success**: all eight HTTPS checks passed (real PostgreSQL community query, anonymous denial, POST 405, origin allowlist, cache control and missing routes).
- Full `Free World Knowledge Forum - security and domain tests` run **41368448903** concluded **success** with existing SQLite, JWT, member-session, moderation, PostgreSQL adapter and gateway regression tests. A flaky signature-tampering test was corrected to change an actual signature byte; no production code, token or credential was changed by that fix.
- `neon_auth` on the **main** branch still reports **not enabled**. No production branch mutation, no private user data, no token transactions.
- Independent Neon Function inventory confirms `fwkfdata` staging deployment ID **1 completed**. This is a **read-only private alpha**, not an operational public Reddit/Quora-style service.
