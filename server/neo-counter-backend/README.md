# NEO Counter Durable Backend

Node 24 service providing the authoritative shared-state boundary for NEO Counter registers.

## Capabilities

- SQLite persistence through `node:sqlite` with WAL mode.
- Versioned merchant state and optimistic concurrency control.
- Append-only event ledger for synchronized state and register/transaction events.
- Bearer API-key authentication using a SHA-256 hash stored server-side.
- Restricted CORS origin for the GitHub Pages frontend.
- No private keys, seed phrases, cardholder data, transaction signing, or custody.

## Run

```bash
export NEO_COUNTER_DB_PATH=data/neo-counter.sqlite
export NEO_COUNTER_PORT=8787
export NEO_COUNTER_ALLOWED_ORIGIN=https://shemsizedek.github.io
# sha256 hex digest of the bearer token; leave empty only for local development.
export NEO_COUNTER_API_KEY_HASH=<sha256-hex>
npm run neo-counter:server
```

Point the frontend at this service with `VITE_NEO_COUNTER_SYNC_ENDPOINT`.

## API

- `GET /health`
- `GET /merchant/:merchantId/snapshot?afterVersion=N`
- `POST /sync` — accepts the existing NEO Counter `SyncEnvelope`; returns HTTP 409 with the authoritative remote envelope when the submitted version is stale.
- `GET /merchant/:merchantId/events?limit=100`
- `POST /merchant/:merchantId/events`

## Data model

`sync_state` stores the current authoritative envelope for each merchant/entity pair. `event_ledger` is append-only and records each accepted sync plus explicit register events. SQLite transactions and `BEGIN IMMEDIATE` serialize state-version updates at the database boundary.

For multi-node production deployment, keep the API contract and replace the store adapter with managed PostgreSQL or another transactional database. SQLite is suitable for the first single-service durable deployment and local/on-prem terminal coordination.
