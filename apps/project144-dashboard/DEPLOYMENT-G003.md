# PROJECT144-G003 — Private dashboard readiness

Source branch: `feature/project144-g002-command-dashboard` / draft PR #1018.

## Build locally
Run from repository root:
```bash
npm ci
npx tsc --noEmit
npx vite build --config apps/project144-dashboard/vite.config.ts
node --test apps/project144-dashboard/private-server.test.mjs
```
The main repository's TypeScript project may have unrelated errors: record both whole-repository and isolated results.

## Private server
This service is **not safe to launch publicly** without TLS and proper ingress/identity controls. It uses HTTP Basic Authentication and is intended behind an HTTPS terminating reverse proxy with access restricted to authorized operators.

Required runtime:
- `COMMAND_USER`: nonempty unique operator account
- `COMMAND_PASSWORD`: a long random secret, stored in the Render environment, never in Git
- `GITHUB_TOKEN`: optional read-only fine-grained token for repository metadata/contents (required for private repos)
- `HEALTH_TARGETS`: optional comma-separated **operator configured** HTTPS endpoints, no arbitrary browser-supplied targets.
- `PORT`: assigned by provider.

Start with `node apps/project144-dashboard/private-server.mjs` after the isolated Vite build.

## Build/deployment stage
Do NOT create a Render static site: static hosting exposes the registry. Use a protected private deployment with a trusted TLS ingress and authorized access policies. On Render, web-service URLs are publicly reachable unless actively protected. Do not deploy to an unrestricted URL. Avoid IP-only controls where mobile operator IPs change. Ensure no live information is returned to unauthorized clients.

## Verification checklist
- [ ] Install dependencies and run Vite build
- [ ] Run Node tests and browser/mobile smoke test
- [ ] Check an unauthorized request returns 401 and never leaks assets, data or health results
- [ ] Check missing credential configuration returns 503
- [ ] Verify login through HTTPS and prohibit cleartext basic auth
- [ ] Confirm Github snapshot and configured HTTPS health probes
- [ ] Reconcile 29 curated projects against actual source and external deployments
- [ ] Recheck each registry source path, including those newly found via search
- [ ] Document approved audience and rollout route
- [ ] Approve private deployment, then release

## Evidence
A GitHub contents API HTTP 200 confirms source only. Healthy HTTP responses confirm endpoint accessibility, not complete business operation. Any external registration, financial authority, legal status, SDG recognition, securities entitlement, custody or title transfer requires separate documentary evidence.

## Code boundaries
The API fetches GitHub server-side, using a 5-minute in-memory cache; no browser token. Health targets are operator-configured. There are no write endpoints. The dashboard source registry remains a curated snapshot until a program owner approves a write model and provenance rules.
