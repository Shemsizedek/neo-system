# NEO Counter Production Connection

GitHub Pages remains the canonical frontend. The authenticated backend is deployed separately on Google Cloud Run.

## Backend runtime

The backend uses the NEO Counter service implementation in `server/neo-counter-backend` and its authorized persistent store. Production deployment must package the HTTP service for Cloud Run rather than depend on a vendor-specific serverless route wrapper.

Required backend environment variables include the authorized persistent-store configuration plus:

- `NEO_COUNTER_ALLOWED_ORIGIN=https://shemsizedek.github.io`
- `NEO_COUNTER_TERMINALS_JSON` containing enabled terminal IDs and SHA-256 terminal-secret hashes
- `NEO_COUNTER_STAFF_JSON` containing active staff IDs, SHA-256 PIN hashes, and permission scopes
- `NEO_COUNTER_SESSION_TTL_MS` (optional; defaults to 8 hours)
- `NEO_COUNTER_API_KEY_HASH` (optional administrative bootstrap credential)

Do not commit terminal secrets, staff PINs, API keys, datastore tokens, private keys, seed phrases, or cardholder data.

Use the deployed Cloud Run service origin as the API base URL.

## GitHub Pages connection

Set the GitHub repository variable `NEO_COUNTER_SYNC_ENDPOINT` to the deployed Cloud Run API base URL.

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

Merchant state updates must remain atomic in the selected persistent adapter. A stale write returns HTTP 409 with the current remote envelope. Sessions must retain TTL expiration.

Local/on-prem operation continues to use the SQLite backend and does not require the hosted adapter.
