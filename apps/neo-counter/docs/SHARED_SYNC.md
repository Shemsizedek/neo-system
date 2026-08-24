# NEO Counter Shared Register Sync

## Purpose
Move merchant operations from one-browser persistence toward an authoritative shared state usable by multiple registers and locations without sacrificing offline operation.

## Client contract
NEO Counter wraps shared writes in versioned `SyncEnvelope` records containing merchant ID, terminal ID, entity type, version, update timestamp, and payload.

## Backend endpoints
- `GET /merchant/:merchantId/snapshot?afterVersion=<n>` returns the newest authoritative snapshot or HTTP 204 when no newer version exists.
- `POST /sync` accepts a `SyncEnvelope` and returns the accepted authoritative envelope.
- A stale write MUST return HTTP 409. The server must never silently overwrite a newer version.

## Offline behavior
If the register is offline or the shared backend is unavailable, writes are queued locally. The operator can flush the queue when connectivity returns. The queue is bounded to the most recent 200 records.

## Conflict policy
The present client does not auto-resolve version conflicts. A 409 is surfaced and the local change remains queued. The production backend should return the current remote version so a later UI can support remote-wins, local-wins, or manual merge according to role/permission.

## Security boundary
This layer synchronizes merchant operations metadata only. It does not transmit private keys, seed phrases, raw cardholder data, signing material, or custody credentials.

## Production next step
Connect `VITE_NEO_COUNTER_SYNC_ENDPOINT` to an authenticated backend with durable storage, merchant/terminal authorization, audit logs, idempotency keys, database transactions, and per-entity authorization rules.
