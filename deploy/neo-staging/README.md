# NEO System staging on Render

This deployment serves the existing NEO frontend from an isolated branch. It is a public staging preview, with no production credentials or live backend connections. Every HTML page displays a staging notice. Browser API connections are restricted to this origin, form submissions are blocked, and the server rejects write methods. External navigation links can still open production websites.

## Render configuration

| Setting | Value |
| --- | --- |
| Workspace | NEO workspace (`tea-db8bbpij9qps73cb7gb0`) |
| Service name | `neo-system-staging` |
| Type | Node web service |
| Plan | Free staging instance |
| Repository | `https://github.com/Shemsizedek/neo-system` |
| Branch | `neo-system-staging-20261021` |
| Auto deploy | Disabled |
| Build command | `npm ci && RENDER=true npm run build && node --test deploy/neo-staging/server.test.mjs` |
| Start command | `node deploy/neo-staging/server.mjs` |
| Health path | `/healthz` |
| Environment | `NODE_ENV=production`, `NODE_VERSION=24`, `NPM_CONFIG_PRODUCTION=false` |

The process binds to `0.0.0.0` and the Render-supplied `PORT`. TypeScript and Vite are needed during build, so development dependencies must remain installed. The build uses `/` for asset paths. This service needs no database, disk, secret, custom domain, or production DNS change. Its free instance can sleep when idle.

## Release checks

1. The production build and existing 766-test suite passed at source commit `a7aba09fea76d42b31114388792cf082ee66f4ea`.
2. Run the staging server tests to verify health, static assets, deep routes, missing APIs, write rejection, and traversal protection.
3. After creating the service, retain its returned service ID and initial deploy ID. Wait for that deploy to become `live`.
4. Request `/healthz`; match `revision` to the staging commit. Request `/`, its actual JavaScript and CSS assets, `/neo-prime/`, and a deep UI route.
5. Verify an unavailable `/api/` route returns JSON 503 and a write returns 405. This confirms staging boundaries, not authentication or business workflow readiness.

## Current delivery boundary

No Render service or live deployment is established by these source files. Service creation is pending restoration of the Render app connection, which returned a missing connection reference during workspace discovery on 21 October 2026.

The existing authenticated APIs, accounts, storage, payments, mining, and AI gateways require separately configured staging backends. A working frontend does not establish those capabilities. The separate Noogle staging blueprint at repository root is preserved.
