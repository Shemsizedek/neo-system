# Project 144 — Gate 024: NEO Core P1 recovery guard and Forum identity SDK correction

**Date:** November 1, 2026 (America/New_York)  
**Status:** Recovery diagnosis verified; safeguard added; Forum remains closed for public posting.

## Verified NEO Core availability
- `https://neo.holytemples.org/`: HTTP 200, public workspace page displays.
- `/health`: HTTP 200, but explicitly reports `mode=public-recovery`, not full service.
- `/neosync/`: HTTP 503 with service recovery content.
- `/corpus/`: HTTP 503.
- `/sitemap.xml`: HTTP 503.
- `/api/library`: HTTP 200 (public knowledge snapshot).
- `https://neo-system.onrender.com/health`: HTTP 502.
- `https://neo-platform-api-recovery.onrender.com/health`: HTTP 503.

Connected Render service ID `srv-db8be4u89jmc73cu2s3g` still deploys from `main`, auto deploy enabled, with the bad `startCommand: Yarn start`. Source inspection confirmed `server/neo-edge/production.mjs` exports the production startup path. The prior documented corrective setting is `node server/neo-edge/production.mjs`. **This service setting has not been changed** because the available connector has no start-command edit capability. Changing the setting is necessary but not sufficient: verify runtime dependencies, health, auth and each public service before shifting production traffic.

Public continuity Worker `deploy/temple-continuity/worker/index.js` intentionally serves temporary 503 for `/neosync/`, and it should not be bypassed until the actual backend and member security work.

## Delivered code
- `scripts/verify-neo-core-recovery.mjs`: non-destructive, HTTPS-only, allowlisted endpoint checks for backend health, NEOsync and Corpus; fails closed on a recovery page or 502/503. Does **not** confuse a successful public recovery shell with operational services.
- `.github/workflows/neo-core-recovery-check.yml`: **manual** GitHub Actions check; no DNS or production mutations, and no automatic repeated requests. A successful run verifies public responses only; member and data-flow acceptance still separate.
- Forum staging `apps/fwkf-forum/web/auth-sdk.mjs`: corrected to the official Managed Better Auth standalone import `@neondatabase/auth`; source does **not** deploy sign-in or create users by itself. The staging Auth branch remains isolated.
- No Penguin use; no paid subscription or service creations.

## Forum staging register
- Neon project `purple-waterfall-10955254`, branch `br-misty-sun-b850yi7t` ready, expires **2026-11-15 23:00 UTC**.
- Branch Managed Better Auth enabled; `neon_auth.user` count **zero**.
- Forum `fwkf_forum.members` count **zero**, `fwkf_forum.posts` count **zero**; six draft communities. No fabricated credentials or private conversation contents uploaded.
- Existing database read API, JWT validation, draft-only communities and disabled POST remain the last verified live forum state.
- Real sign-in, signed session renewal, authorized membership and two-user moderated posting are **not** demonstrated. The user must authorize a controlled account identity / ownership and the appropriate policy for test account creation. Avoid uncontrolled public signup.

## Critical path next
1. **NEO P1 recovery:** Apply the verified Render start command using an authorized dashboard operation; then validate actual backend startup, NEOsync / Corpus routes, permissions, and data connectivity. Preserve the public continuity shell and rollback capability until healthy.
2. **Forum identities:** Configure two controlled, verified Neon Auth test identities and complete sign-in/sign-out/session verification; separately bind Forum roles with explicit approval. Do not enable public signup.
3. **Forum E2E:** Private write gateway with rate limits, audit and backup/restore tests, moderator approvals and two-member authorizations. Keep production posting closed.
4. Retest direct system homepage and linked services; avoid conflating HTTP 200 with NEO Core service health.

**Primary incidents:** [NEO Core P1 #1219](https://github.com/Shemsizedek/neo-system/issues/1219), [Forum #1298](https://github.com/Shemsizedek/neo-system/issues/1298).
