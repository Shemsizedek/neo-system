# NEO Counter Production Connection

GitHub Pages remains the canonical frontend. The authenticated backend runs on Google Cloud Run with Firestore as the authoritative production datastore.

## Production runtime

Use `server/neo-counter-backend/firestore-server.mjs` with an authenticated Firestore-compatible `db` injected by the Cloud Run bootstrap. Runtime credentials belong to the Google Cloud service identity/IAM layer; do not commit service-account JSON keys.

The Firestore adapter is `server/neo-counter-backend/firestore-context.mjs` and preserves the existing HTTP contract while replacing Redis persistence.

Required environment variables:

- `NEO_COUNTER_ALLOWED_ORIGIN=https://shemsizedek.github.io`
- `NEO_COUNTER_TERMINALS_JSON` containing enabled terminal IDs and SHA-256 terminal-secret hashes
- `NEO_COUNTER_STAFF_JSON` containing active staff IDs, SHA-256 PIN hashes, and permission scopes
- `NEO_COUNTER_SESSION_TTL_MS` (optional; defaults to 8 hours)
- `NEO_COUNTER_API_KEY_HASH` (optional administrative bootstrap credential)

Do not commit terminal secrets, staff PINs, API keys, private keys, seed phrases, cardholder data, or service-account keys.

## Firestore collections

- `neo_counter_state` — merchant/entity envelopes
- `neo_counter_events` — audit and transaction events; event document ID is the idempotency key
- `neo_counter_sessions` — SHA-256 token hashes only; plaintext bearer tokens are never stored

`putEnvelope` uses a Firestore transaction to compare the current version, write the next envelope, and append its audit event atomically. A stale write returns the current remote envelope as HTTP 409 through the service handler.

`neo_counter_events` requires a composite index for `merchantId ASC, createdAt DESC` when Firestore requests it.

## GitHub Pages connection

Set repository variable `NEO_COUNTER_SYNC_ENDPOINT` to the deployed Cloud Run service origin. The Pages build exposes this only as the public API endpoint; it is not a credential.

## Production contract

- `GET /health`
- `POST /session`
- `GET /session/me`
- `DELETE /session`
- `GET /merchant/:merchantId/snapshot`
- `POST /sync`
- `GET /merchant/:merchantId/events`
- `POST /merchant/:merchantId/events`

## Runtime separation

Production: Cloud Run + Firestore.

Local/on-prem: the existing SQLite backend remains available for offline development and local operation.

The Redis REST adapter is legacy migration code and is not the production source of truth.
