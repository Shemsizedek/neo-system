# NEO WordPress Adapter v0.1

Permanent WordPress.com adapter for NEO Gateway. This first gate is intentionally **read-only**.

## Scope

- OAuth bearer-token authentication supplied through runtime secrets.
- World Temple registry entry (`241770410`, `holytemples.org`).
- Service health endpoint.
- Authenticated WordPress read-health endpoint.
- Authenticated recent-post read endpoint.
- No draft creation.
- No publishing.
- No page/post updates.
- No delete operations.

## Routes

- `GET /health` — adapter process/configuration state.
- `GET /sites` — registered WordPress sites and declared capabilities.
- `GET /sites/world-temple` — World Temple registry record.
- `GET /sites/world-temple/health` — authenticated read check against WordPress.com.
- `GET /sites/world-temple/posts?limit=5` — authenticated recent-post read.

All non-GET/HEAD methods return `405 read_only_adapter`.

## Authentication

Create a WordPress.com OAuth access token for the authorized NEO Gateway application and store it as the runtime secret:

```text
WORDPRESS_ACCESS_TOKEN=...
```

Do **not** commit the token. The repository contains only `.env.example`.

The adapter uses the official WordPress.com API base at `https://public-api.wordpress.com` and performs authenticated reads through the WordPress REST API.

## Local validation

```bash
cd services/neo-wordpress-adapter
npm install
npm run typecheck
npx wrangler secret put WORDPRESS_ACCESS_TOKEN
npm run dev
```

Then verify:

```bash
curl http://localhost:8787/health
curl http://localhost:8787/sites/world-temple
curl http://localhost:8787/sites/world-temple/health
curl 'http://localhost:8787/sites/world-temple/posts?limit=1'
```

The gate passes only when `/sites/world-temple/health` reports `ok: true` with an authenticated WordPress response.

## Permission progression

1. **v0.1 READ** — current gate.
2. **v0.2 DRAFT** — add explicit draft-only creation after v0.1 authentication/health passes.
3. **PUBLISH** — remains approval-gated and must not be enabled implicitly by the draft gate.

## World Bulletin continuity

The World Temple blog's Noocracy Papers remain a WordPress editorial workflow. Paper #11 should preserve Paper #10's existing Gutenberg paragraph format, taxonomy, and author-line convention. The adapter does not create or publish Paper #11 in v0.1.
