# NEO Tribunal v0.8 — Server Backend & Workspace Sync

This milestone moves the Tribunal from browser-only collaboration primitives toward a durable multi-user service.

## Implemented

- Node 24 HTTP service under `server/tribunal-backend/`.
- SQLite persistence using Node's built-in `node:sqlite` `DatabaseSync` API.
- Password authentication with `scrypt` password hashes.
- Opaque bearer sessions stored only as SHA-256 token hashes.
- Workspace creation and durable memberships.
- Invitation tokens with expiration, email binding, role assignment, and one-time acceptance.
- Server-enforced RBAC for Tribunal workspaces.
- AES-256-GCM encrypted case envelopes at rest. The server stores encrypted case JSON rather than plaintext case bodies.
- Optimistic revision checks for cross-device synchronization and write-conflict detection.
- Append-only, hash-linked workspace audit events.
- Audit export with replication digest for secondary archival/replica systems.
- Browser client wrapper in `src/tribunal/serverApi.ts`.
- Automated service tests covering authentication, invitations, encrypted case sync, revision conflicts, audit verification, and RBAC.

## Required production configuration

Set `NEO_TRIBUNAL_MASTER_KEY` to a high-entropy secret in the deployment environment. The fallback key is development-only and must not be used in production.

Optional:

- `NEO_TRIBUNAL_DB=/persistent/path/neo-tribunal.sqlite`
- `PORT=8787`

Run locally:

```bash
npm run tribunal:server
```

Run backend tests:

```bash
npm test
```

## Security model

Authentication establishes application identity. Workspace membership establishes scope. RBAC is enforced again on the server for every protected operation; client-side role checks are only user-interface conveniences.

Case records are encrypted with AES-256-GCM before persistence. Session and invitation secrets are never stored in reusable plaintext form. The audit chain links every event to the preceding workspace event, making silent mutation detectable when the chain is reverified.

## Synchronization model

Each case has a monotonically increasing `revision`. A client may supply `expectedRevision` on save. If another device has already written a newer revision, the server returns a conflict instead of silently overwriting the newer record.

## Audit replication

`GET /v1/workspaces/:workspaceId/audit/export?afterSeq=N` returns ordered immutable audit rows plus a `replicaDigest`. A secondary archive can store the export, request later deltas after the returned sequence, and independently verify the chain.

## Boundary

This backend provides authenticated records, workflow coordination, integrity controls, and internal institutional administration. Software deployment does not itself confer governmental, judicial, police, military, diplomatic, or territorial authority outside whatever authority is otherwise lawfully recognized.
