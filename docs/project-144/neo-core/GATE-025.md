# Project 144 — Gate 025: NEO Core clean-server recovery rehearsal

**Date:** November 1, 2026 (Eastern), November 2 cloud logs (UTC)  
**Priority:** P1 NEO Core restart; **status: recovery fix TESTED IN ISOLATED CLOUD RUNNER, NOT PROMOTED TO PRODUCTION.**

## Root cause verified from Render logs
- Service: `neo-system` / `srv-db8be4u89jmc73cu2s3g`, Render workspace `NEO workspace`.
- Deployment `dep-dbjt706q1p3s73b5njmg` of main commit `d6f84ad5b0102f4ec10f3ff6ca1739c4cde7e5b8`: `update_failed`.
- **Build step successful**: `npm install; npm run build`, Node 24.22.2, Vite compiled.
- **Start step fails**: Render runs literal `Yarn start` (uppercase Y); `bash: line 1: Yarn: command not found` and exit **127**. The repository package.json also has no `start` script; lowercase `yarn start` would not be the intended fix.
- Verified intended entrypoint: `node server/neo-edge/production.mjs`. It binds `process.env.PORT` on `0.0.0.0`, starts legacy NEO edge internally and provides NEO home/NEOsync/Corpus routes.

## Actual code delivered
Branch `fix/neo-core-render-start-025`, draft PR **#1300** (not merged):
- `scripts/verify-neo-core-startup.mjs`: tests exact production entrypoint with a random isolated test port and real Host/X-Forwarded-Host routing. Fails closed on missing/non-200 real health, recovery placeholder or unwanted member access on Render's direct hostname.
- `.github/workflows/neo-core-startup-025.yml`: reproduces Render's frontend build with `npm install` and `npm run build` on GitHub-hosted Node 24, then runs the boot/route test. No cloud service, DNS, secrets or production database changes.
- `server/neo-edge/production.mjs`: **narrow, allowlisted Render-origin health probe**. Direct `GET https://neo-system.onrender.com/health` is routed internally to the canonical NEO legacy /health handler; it does not open /neosync or any other member route on the Render origin. All other host routing remains as before.

## Verified cloud test results
- First CI run **41374591791**: build passed, actual server booted, canonical homepage 200, but legacy host probe returned HTTP 421 because X-Forwarded-Host was not set. This was a test-host issue; canonical service is in the strict host registry.
- Second CI run **41374690131**: **success** with canonical X-Forwarded-Host. `/health`, `/`, `/neosync/`, `/corpus/` all **HTTP 200** in an isolated local process; no user sessions tested.
- Third CI run **41374839918**: **success** after adding the narrow Render-host health exception. Real canonical health **200**, direct Render-origin health **200**, direct Render-origin `/neosync/` **421** (intentionally not exposed), canonical homepage/NEOsync/Corpus all **200**. This is a clean-start functional smoke, not production proof.
- Rechecked actual public service after CI: `https://neo.holytemples.org/health` still reports **public-recovery**; `/neosync/` still **503**, and `https://neo-system.onrender.com/health` still **502**. No production change has been made.

## Exact production handoff and rollback
1. Review source change and successful CI in PR #1300; confirm no new runtime dependencies and health route does not expose member functions through onrender.com.
2. Merge approved, tested PR #1300 into `main` (auto deploy will still fail while Render keeps `Yarn start`).
3. In the existing service [Render dashboard](https://dashboard.render.com/web/srv-db8be4u89jmc73cu2s3g), under **Settings → Build & Deploy → Start Command**, replace `Yarn start` with:
   `node server/neo-edge/production.mjs`
   Do not create a new paid service, change rootDir, alter all workspace services, or deploy new DNS.
4. Set/confirm health check path `/health` **only after the code with Render-only health exception is deployed**; otherwise the direct hostname can return 421 and a health-check cutover may falsely fail.
5. Verify direct origin `GET /health` gives 200 with `edge=neo-edge`, `service.id=neo-system`, not `public-recovery`; verify source scripts and member-session safety on canonical host.
6. Keep existing `temple-continuity` Worker live until an authenticated, permission-checked NEOsync conversation, Corpus and library data flows pass a controlled smoke. Switch only approved paths after full backend readiness and rollback plan.
7. Roll back the Render Start Command to its recorded previous value and re-enable continuity-only routing if the new service fails; retain the PR commit and health logs for diagnosis. For a **functional rollback**, prefer the last known healthy startup/deploy; merely reverting to `Yarn start` reintroduces an outage. No automatic DNS cutover or destructive rollback in this gate.

## Security follow-up — Forum
- Isolated Neon `fwkf-forum-g020-staging` branch `br-misty-sun-b850yi7t` ready; **six draft communities, zero Auth users, zero Forum members and posts** at readback. Branch expiration November 15, 2026.
- Managed Better Auth branch self-registration and email-verification policies require hardening before testing. The separate Forum API enforces approved membership and currently rejects all posting routes; this is **not** a substitute for secure identity-provider configuration.
- The available Neon Auth connector can read the configuration but offers only renaming under `update_auth_config`, not the required sign-up policy change. Do not claim server-side Auth self-registration is disabled; no user was created.
- Before inviting real testers, use the Neon Console / supported Auth management surface to disable uninvited sign-up, require verification as appropriate, review trusted domains and use controlled, owner-authorized test emails. Then verify actual login/JWT/member binding and two-member moderated posting end to end.
- No Penguin, paid upgrade, test mailbox fabrication, external DNS changes or sensitive private chat disclosures.

**Related:** NEO Core incident [#1219](https://github.com/Shemsizedek/neo-system/issues/1219), draft recovery PR [#1300](https://github.com/Shemsizedek/neo-system/pull/1300), Forum [#1298](https://github.com/Shemsizedek/neo-system/issues/1298).
