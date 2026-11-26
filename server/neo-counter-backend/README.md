# NEO Counter Durable Backend

Node 24 service providing the authoritative shared-state boundary for NEO Counter registers.

## Capabilities

- SQLite persistence through `node:sqlite` with WAL mode.
- Versioned merchant state and optimistic concurrency control.
- Append-only event ledger for synchronized state and register/transaction events.
- Short-lived terminal + staff sessions with scoped permissions.
- Optional administrative bearer API key retained only as a bootstrap/operations path.
- Restricted CORS origin for the GitHub Pages frontend.
- No private keys, seed phrases, cardholder data, transaction signing, or custody.

## Run

```bash
export NEO_COUNTER_DB_PATH=data/neo-counter.sqlite
export NEO_COUNTER_PORT=8787
export NEO_COUNTER_ALLOWED_ORIGIN=https://shemsizedek.github.io
export NEO_COUNTER_SESSION_TTL_MS=28800000

# Optional administrative bearer token hash (sha256 hex).
export NEO_COUNTER_API_KEY_HASH=<sha256-hex>

# Provisioned terminal identities. Store only SHA-256 hashes of secrets.
export NEO_COUNTER_TERMINALS_JSON='[{"id":"neo-terminal-01","merchantId":"merchant_144","secretHash":"<sha256-hex>","enabled":true}]'

# Provisioned staff identities and scoped permissions. Store only SHA-256 PIN hashes.
export NEO_COUNTER_STAFF_JSON='[{"id":"staff_owner","merchantId":"merchant_144","pinHash":"<sha256-hex>","permissions":["register","settings","reports"],"active":true}]'

npm run neo-counter:server
```

Point the frontend at this service with `VITE_NEO_COUNTER_SYNC_ENDPOINT`.

## Session API

- `POST /session` — exchanges merchant ID, terminal ID/secret, staff ID/PIN for a short-lived bearer token.
- `GET /session/me` — returns the current terminal/staff principal and permission scopes.
- `DELETE /session` — revokes the current session.

Session tokens are SHA-256 hashed at rest in SQLite and are kept only in browser memory by the frontend. Refreshing or closing the page clears the frontend token.

## Shared-state API

- `GET /health`
- `GET /merchant/:merchantId/snapshot?afterVersion=N`
- `POST /sync` — accepts the existing NEO Counter `SyncEnvelope`; returns HTTP 409 with the authoritative remote envelope when the submitted version is stale.
- `GET /merchant/:merchantId/events?limit=100`
- `POST /merchant/:merchantId/events`

Permissions are enforced per route. Register access can read shared state and append register events; settings access is required to push `merchant_ops`; reports/settings access is required to read the event ledger.

## Data model

`sync_state` stores the current authoritative envelope for each merchant/entity pair. `event_ledger` is append-only and records each accepted sync plus explicit register events. `auth_sessions` stores only hashed bearer tokens with merchant, terminal, staff, permissions, expiry, and revocation metadata. SQLite transactions and `BEGIN IMMEDIATE` serialize state-version updates at the database boundary.

For multi-node production deployment, keep the API contract and replace the store adapter with managed PostgreSQL or another transactional database. SQLite is suitable for the first single-service durable deployment and local/on-prem terminal coordination.

## Internal payment allocation (SQLite only; opt-in)

`createStore(path, { paymentVerifier, now })` exposes `paymentAllocations` only when trusted server code supplies `paymentVerifier`. Without it, the property is `null`; existing HTTP routes do not enable allocation.

- `registerOrder(order)` binds an immutable, server-authoritative merchant/order to network, rail, asset, destination, integer atomic-unit amount, minimum confirmations and expiry. Browser query parameters are not an authoritative order.
- `allocate({ merchantId, orderId, txid, eventIndex })` calls the verifier with the stored order and normalized reference. The verifier must independently obtain canonical chain evidence, check Counterparty validity/asset divisibility and node synchronization, and return the matching destination, amount in atomic units, confirmations, block hash and block time.
- `eventIndex` must be the canonical Bitcoin output index or Counterparty send/message locator used consistently by the verifier, never an arbitrary caller-selected alias for the same payment.
- A global unique payment locator and unique merchant/order constraint are enforced in a SQLite transaction. Concurrent claims cannot assign the same payment twice. Same-order retries reverify and return the existing allocation. Changed block identity or amount requires review; no automatic release/reassignment is performed.
- New allocations reject expired orders, including expiry while awaiting the verifier. A late retry of an existing allocation remains possible after fresh verification. This conservative policy may send legitimately late payments to manual review.

Allocation records do not transfer funds or authorize fulfillment. Continue to enforce merchant authorization and Crown policy at any future HTTP integration, and revalidate chain finality before irreversible fulfillment. The generic event ledger and browser callback remain untrusted for payment proof. This module does not change the Redis, Firestore or Cloudflare adapters. Keep their allocation capability disabled until equivalent atomic constraints and tests exist.

Run `npm run neo-counter:server:test` to include synthetic evidence, rejection, retry, restart and two-connection race tests. No built-in live chain verifier, HTTP allocation route or deployed staging integration is supplied here.
