# NEO Counter Production Connection

GitHub Pages remains the canonical frontend. The authenticated backend runs on a provider-independent service runtime and must not depend on Vercel.

## Platform persistence target

Firestore is the NEO platform primary managed persistence layer. NEO Counter is currently a documented migration exception because its hosted backend implementation still uses the dependency-free Upstash Redis REST adapter in `server/neo-counter-backend/redis-rest.mjs`.

Do not describe the current NEO Counter backend as Firestore-backed until a tested Firestore adapter replaces that Redis-specific implementation.

## Current backend runtime

The production entrypoint remains `api/neo-counter/[...path].mjs` while the service is migrated to the shared Firestore boundary.

Current migration-exception environment variables:

- `UPSTASH_REDIS_REST_URL` (or `KV_REST_API_URL`)
- `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_TOKEN`)
- `NEO_COUNTER_ALLOWED_ORIGIN=https://shemsizedek.github.io`
- `NEO_COUNTER_TERMINALS_JSON` containing enabled terminal IDs and SHA-256 terminal-secret hashes
- `NEO_COUNTER_STAFF_JSON` containing active staff IDs, SHA-256 PIN hashes, and permission scopes
- `NEO_COUNTER_SESSION_TTL_MS` (optional; defaults to 8 hours)
- `NEO_COUNTER_API_KEY_HASH` (optional administrative bootstrap credential)

Do not commit terminal secrets, staff PINs, API keys, Redis tokens, private keys, seed phrases, cardholder data, or Firestore service-account keys.

There is no canonical Vercel deployment configuration. Deploy the API to an authorized service runtime and expose the service origin plus `/api/neo-counter`.

## GitHub Pages connection

Set the GitHub repository variable `NEO_COUNTER_SYNC_ENDPOINT` to the deployed API base URL, for example:

`https://<service-runtime>/api/neo-counter`

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

Until Firestore migration completes, merchant state updates continue to use the existing Redis compare-and-set behavior and session TTL model. The migration must preserve concurrency guarantees, idempotency, authentication, and event ordering before the Redis exception is retired.

Local/on-prem operation continues to use the SQLite backend unless separately migrated.
