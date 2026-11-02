# Project 144 — Gate 023: verified NEO status and hardened private Forum database access

**Date:** November 1, 2026 (Eastern; UTC infrastructure logs after midnight Nov 2)
**Decision:** NEO Core is **publicly available but degraded**. Forum staging advances through least-privilege read-only PostgreSQL controls; **real invited-member sign-in and posting workflow remain unverified and closed**.

## NEO System availability (read-only evidence)

- `https://neo.holytemples.org/`: HTTP **200**, actual NEO workspace visible; lists 12 services. This verifies the public site, **not** all linked services.
- `https://neo.holytemples.org/health`: HTTP **200** but explicitly `mode=public-recovery`, `service=temple-continuity`.
- `/neosync/`: HTTP **503**, intentional “NEOsync is recovering” maintenance response.
- `/corpus/`: HTTP **503**, generic recovery page.
- `/sitemap.xml`: HTTP **503**; needs SEO route restore.
- `/api/library`: HTTP **200**, public snapshot data available.
- `/api/noogle/search?q=knowledge`: HTTP **200**, endpoint available; search results empty for this test.
- Direct Render `https://neo-system.onrender.com/health`: HTTP **502**.
- `https://neo-platform-api-recovery.onrender.com/health`: HTTP **503**.
- Connected Render `get_service` confirms `srv-db8be4u89jmc73cu2s3g`, branch `main`, `autoDeploy=yes`, **startCommand=Yarn start**. October recovery runbook indicates the intended Node entrypoint: `node server/neo-edge/production.mjs`.
- GitHub source `deploy/temple-continuity/worker/index.js` deliberately returns 503 for `/neosync/` and unhandled routes; the Worker is a public availability fallback, not a live NEOsync back end.
- **Blocker:** The available Render connector has get/deploy, **no service start-command editor**. Changing the production Render setting requires a supported authorized control and verification of dependencies and rollback. Do not bypass it, change DNS, or claim NEO Core recovered. Historical Google billing-disabled dependencies may remain unavailable.
- Existing incident **[#1219](https://github.com/Shemsizedek/neo-system/issues/1219)** updated with current HTTP, service configuration, and recovery sequence.

## Forum Gate 023 verified change

- Existing Neon project `neo-twlf-forum` `purple-waterfall-10955254`. **Isolated** staging branch `br-misty-sun-b850yi7t`; remains ready, expires **2026-11-15T23:00:00Z**.
- `apps/fwkf-forum/migrations/0002_readonly_api_role.sql` committed and **applied to staging only**. Creates `fwkf_forum_reader` **NOLOGIN** role with explicit schema USAGE, column-limited SELECT on `communities` and `members`, no permission to write posts or to read reports. The existing DB owner can `SET ROLE` to it in a transaction.
- Verified role permissions with Neon `pg_roles`, `has_table_privilege` and `has_column_privilege`: reader `rolcanlogin=false`, `can_write_posts=false`, `can_read_reports=false`, only approved columns readable. Direct `SET LOCAL ROLE fwkf_forum_reader` and public-community query succeeded.
- Gateway source `apps/fwkf-forum/functions/data/handler.mjs` now executes each database request in `BEGIN READ ONLY`, `SET LOCAL ROLE fwkf_forum_reader`, parameterized SELECT, then COMMIT or ROLLBACK. Failure to acquire the reader role returns a generic 503 without leaking results. **Important:** The Neon Function still receives an owner-capable `DATABASE_URL`; role switch is enforced by source code, not a separately credentialed least-privilege connection yet.
- GitHub Actions build **41372526393** and Forum security tests **41372526409** succeeded; deployed `fwkfdata` staging **deployment ID 2**, Neon reported **completed**. Fresh HTTPS: `GET /health` 200, `GET /communities` 200 with empty published collection, anonymous `GET /me` 401.
- Added fail-closed database role test, plus automatic live smoke on gateway/role changes. Final CI commit `3eee8ca71b984807d88b9c54b27726a7aee7c40c`: cloud build **41372677383 success**, full Forum security **41372677437 success**, live staging smoke **41372677397 success** (including blocked POST, CORS, missing routes).
- Final Neon readback: **6 draft communities, 0 members, 0 posts, 0 replies, 0 reports**. No live auth user signing in; no private conversation contents were imported.

## Open gate / next milestone

1. Actual **invited test identities** with owner-controlled verified email addresses; authorize two accounts and establish login, logout, session refresh and JWT validation with branch-specific Neon Auth. Do not invent people's personal emails or credentials.
2. Grant approved Forum membership only after verified Neon `auth_subject` binding. Test approved vs pending and revoked status; no unapproved member can write.
3. Build a separately credentialed staging Postgres writer role and protected private API; durable rate limiting, input validation, moderation audit, retention/abuse controls and idempotent transactions.
4. Test two real identities end-to-end: submit **pending** question → moderator approves → visible feed → replies → one vote per user → report → moderation hide/restore; test unauthorized users, backups/restore, rollback.
5. Keep public registration, posting, Forum preview changes, production DNS and all real NEO infrastructure untouched until these tests pass. Penguin is not required for cloud hosting.

**Project priorities:** Repair NEO Core P1 backend and restore NEOsync/Corpus, while continuing the isolated Forum work.
