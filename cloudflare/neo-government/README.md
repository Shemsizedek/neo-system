# NEO Government Gateway

This Worker is the private NEO government control-plane entry point. It is intentionally separate from the public GitHub Pages experience.

## Security model

- Cloudflare Access authenticates the executive user before private controls are rendered.
- The Worker verifies the `CF-Access-Jwt-Assertion` signature against the Cloudflare Access JWKS.
- `ACCESS_AUD` locks the token to the intended Access application.
- Optional `ADMIN_EMAILS` adds a second allow-list inside the Worker.
- GitHub Pages exposes only a restricted-access notice and no command controls.

## Required Worker configuration

Set these Worker secrets/variables after creating the Cloudflare Access application:

- `ACCESS_TEAM_DOMAIN` — for example `your-team.cloudflareaccess.com`
- `ACCESS_AUD` — the Access application AUD tag
- `ADMIN_EMAILS` — optional comma-separated executive email allow-list

The repository already uses `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` GitHub Actions secrets for Cloudflare deployments.

## Routes

- `/health` — public service health only; no private state
- `/` — authenticated Government Hub
- `/api/session` — authenticated session identity
- `/command` — authenticated command-center boundary
- `/neosync` — authenticated private NEOsync boundary
- `/operations` — authenticated operations boundary

The command routes currently expose authenticated capability boundaries only. State-changing executive actions should be added one-by-one with explicit authorization, audit logging, CSRF-safe request handling, and least-privilege service credentials.
