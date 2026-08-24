# NEO Counter Production Connection

GitHub Pages remains the canonical frontend. The authenticated backend is deployed separately as a serverless API.

## Backend runtime

The production entrypoint is `api/neo-counter/[...path].mjs` and uses the dependency-free Upstash Redis REST adapter in `server/neo-counter-backend/redis-rest.mjs`.

Required backend environment variables:

- `UPSTASH_REDIS_REST_URL` (or `KV_REST_API_URL`)
- `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_TOKEN`)
- `NEO_COUNTER_ALLOWED_ORIGIN=https://shemsizedek.github.io`
- `NEO_COUNTER_TERMINALS_JSON` containing enabled terminal IDs and SHA-256 terminal-secret hashes
- `NEO_COUNTER_STAFF_JSON` containing active staff IDs, SHA-256 PIN hashes, and permission scopes
- `NEO_COUNTER_SESSION_TTL_MS` (optional; defaults to 8 hours)
- `NEO_COUNTER_API_KEY_HASH` (optional administrative bootstrap credential)

Do not commit terminal secrets, staff PINs, API keys, Redis tokens, private keys, seed phrases, or cardholder data.

Use `vercel.neo-counter.json` as the isolated backend deployment configuration. The API base URL is the deployed origin plus `/api/neo-counter`.

## GitHub Actions activation

The workflow `.github/workflows/neo-counter-backend-deploy.yml` is the supported production activation path. It keeps GitHub Pages as the public frontend and deploys only the backend API.

Configure the GitHub environment `neo-counter-backend` with these Actions secrets:

- `VERCEL_TOKEN`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEO_COUNTER_TERMINALS_JSON`
- `NEO_COUNTER_STAFF_JSON`
- `NEO_COUNTER_API_KEY_HASH` (optional)

Then run **Deploy NEO Counter Backend** from GitHub Actions. The workflow:

1. installs the locked repository dependencies;
2. runs `npm run neo-counter:server:test`;
3. links the isolated Vercel project `neo-counter-api` under the `neo-b2f7` scope;
4. installs the production environment variables server-side;
5. deploys the API using `vercel.neo-counter.json`;
6. health-checks `/api/neo-counter/health`;
7. prints the exact `NEO_COUNTER_SYNC_ENDPOINT` value in the Actions job summary.

The current connected Vercel tooling cannot provision the project/storage with the available connector permissions, so this workflow is intentionally the source-controlled activation mechanism rather than an unverified manual deployment claim.

## GitHub Pages connection

Set the GitHub repository variable `NEO_COUNTER_SYNC_ENDPOINT` to the deployed API base URL, for example:

`https://<backend-host>/api/neo-counter`

The Pages workflow injects this value into `VITE_NEO_COUNTER_SYNC_ENDPOINT` only while building `apps/neo-counter`. It is a public API origin, not a credential.

The browser acquires short-lived bearer sessions by posting terminal and staff credentials to `/session`. Bearer tokens exist only in memory and are cleared by refresh, tab close, or logout.

## Production contract

- `GET /health`
- `POST /session`
- `GET /session/me`
- `DELETE /session`
- `GET /merchant/:merchantId/snapshot`
- `POST /sync`
- `GET /merchant/:merchantId/events`
- `POST /merchant/:merchantId/events`

Merchant state updates use an atomic Redis Lua compare-and-set operation. A stale write returns HTTP 409 with the current remote envelope. Event records are retained in a merchant-scoped sorted set and sessions use Redis TTL expiration.

Local/on-prem operation continues to use the SQLite backend and does not require the hosted adapter.
