# Project 144 — Gate 07 NEO Core Deployment Recovery Plan

Date: 2026-10-22
Status: DRAFT — no production modification authorized or executed.

## Evidence
- Render workspace: NEO workspace, id `tea-db8bbpij9qps73cb7gb0`.
- Service `neo-system` (`srv-db8be4u89jmc73cu2s3g`) is a Node web service on `main`, with auto-deploy enabled.
- Current Render build command: `npm install; npm run build`.
- Current Render start command: `Yarn start`.
- Recent deploys reported `update_failed`. Logs show successful Vite build followed by `bash: line 1: Yarn: command not found` and exit 127.
- `package.json` defines `dev`, `build`, `test`, and `preview`, but no `start` script in the inspected script manifest.
- `neo-core-staging` (`srv-dbcgvaom7kps739ujmm0`) is a Render static site publishing `dist`; its last inspected deployment was `live`, pinned to commit `a7aba09fea76d42b31114388792cf082ee66f4ea`. HTTP health not independently confirmed.

## Recommended recovery (requires explicit change approval)
1. Preserve current Render service configuration and identify last known healthy deployment.
2. Confirm intended production topology: static Vite frontend versus an actual server with a supported start command.
3. Prefer deploying Vite frontend as a Render static site with publish directory `dist`, after staging parity and smoke tests; do not assume replacing the current web service preserves domains, env, or billing.
4. If server hosting is required, supply a reviewed server entrypoint and supported Node start command; do not use `vite preview` as a production server by default.
5. Verify build, test, route handling, security boundaries, static asset loading, health probes and rollback procedure.
6. Approve a narrow production change, monitor deployment and verify HTTP response; roll back on failure.

## Immediate controls
- No auto-deploy changes, restart, production deploy or service replacement in this gate.
- Do not run `npm audit fix` blindly or expose tokens in client builds.
- CI passing, public HTTP health, custom domain routing, secrets safety and backups remain unverified.

## Gate 07 exit
- [x] Startup failure root cause documented
- [x] Staging reference identified
- [ ] Staging smoke test evidence
- [ ] Approved topology and rollback plan
- [ ] Production configuration corrected
- [ ] Healthy deployment and HTTP smoke test verified

Next gate: controlled staging recovery and production change approval.
