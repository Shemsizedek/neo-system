# NEO Government Gateway

This Worker is the private NEO government control-plane entry point. It is intentionally separate from the public GitHub Pages experience.

## Security model

- Cloudflare Access authenticates the executive user before private controls are rendered.
- The Worker verifies the `CF-Access-Jwt-Assertion` signature against the Cloudflare Access JWKS.
- `ACCESS_AUD` locks the token to the intended Access application.
- Optional `ADMIN_EMAILS` adds a second allow-list inside the Worker.
- GitHub Pages exposes no government command controls.
- Live service proxying is allow-listed by the module adapter registry; arbitrary URLs cannot be supplied by the browser.

## Required Worker configuration

- `ACCESS_TEAM_DOMAIN` — for example `your-team.cloudflareaccess.com`
- `ACCESS_AUD` — the Access application AUD tag
- `ADMIN_EMAILS` — optional comma-separated executive email allow-list

Optional live module bindings:

- `TRIBUNAL_API_URL` — deployed Tribunal backend base URL. Also supplies Chaplaincy E-File until it receives a dedicated service.
- `ROUTER_API_URL` — deployed NEO Router service base URL.
- `NEOSYNC_API_URL` — deployed private NEOsync service base URL.
- `MODULE_ADAPTER_TOKEN` — optional bearer credential forwarded only to configured module services.

When an optional service URL is absent, the console checks the implementation in the `Shemsizedek/neo-system` repository and reports `REPOSITORY` instead of falsely claiming that the service is live. Treasury and other record-oriented modules use the authenticated `GOV_STORE` Durable Object directly and report `LIVE` in native-government-store mode.

## Adapter states

- `LIVE` — a configured service responded successfully, or the module is natively backed by the Government Durable Object.
- `DEGRADED` — a configured service responded with an error HTTP status.
- `OFFLINE` — a configured live endpoint could not be reached.
- `REPOSITORY` — a real implementation exists in GitHub but no live service endpoint has been configured yet.
- `UNAVAILABLE` — neither a configured endpoint nor the expected repository source could be verified.

## Routes

- `/health` — public gateway health only; no private state
- `/` and `/command` — authenticated executive console
- `/api/session` — authenticated executive identity
- `/api/adapters` — health/state of every registered private module adapter
- `/api/adapters/:id/health` — health check one module
- `/api/adapters/:id/proxy/*` — authenticated proxy to a configured live module service
- `/api/snapshot` — persistent government state, records and audit trail
- `/api/records` — create authenticated internal government records
- `/api/actions` — record authorized administrative actions
- `/api/modules/:id/status` — update internal module operating state

## Current adapter map

The executive console recognizes NEOsync Executive Office, Central Solution Office, Inner Bar Temple Tribunal, World Chaplaincy E-File, NEO Treasury, NEO Router, World Police, World Marshals, World Guards, World Defense, NEO Global Arms and NEO Cipher.

The Tribunal repository already contains a substantial backend under `server/tribunal-backend/`. NEO Router already contains its command/event/connector worker stack under `server/neo-router/`. Treasury and Global Arms currently expose their implemented engines in the main application source. The adapter layer makes those distinctions visible rather than presenting every module as equally live.

All state-changing capabilities remain subject to least privilege, audit logging and explicit human authorization. The Government console is an administrative coordination system; it does not itself create external legal, financial, police, military or coercive authority.
