# HOSTING-004 — Portable NEO storage and NEOpay cutover contract

Status: implementation branch; **not** production cutover.

## Provider-neutral storage contract
Implement an adapter interface with `get(collection,id)`, `put(collection,id,value,{expectedVersion})`, `list(collection,{cursor,limit})`, and `transaction(operations)`. Implementations must support deterministic IDs, atomic writes, optimistic concurrency, schema-version metadata, idempotency keys, UTC timestamps, and auditable failure modes.

## Migration order
1. Inventory every Firestore collection, query, security rule, service account, and call site. Treat credentials as secrets; never copy them into Git.
2. Implement the PostgreSQL adapter on Render alongside the existing Firestore adapter. Use environment-based selection; default to the existing provider until explicitly changed.
3. Export a consistent Firestore snapshot into a versioned, encrypted migration artifact; record counts and SHA-256 digests without exposing personal or financial data.
4. Import into a dedicated staging PostgreSQL database. Compare counts, IDs, monetary precision, ownership, permissions, and representative reads. No double-writes of payment transactions until idempotency and rollback have been tested.
5. Exercise NEOpay read-only asset lookup, wallet view, signer-denied path, network failures, auth isolation, and replay prevention.
6. Verify ChatGPT Sites frontend routes and CORS/origin policies against the Render staging endpoint.
7. Promote only after successful tests, backup/restore rehearsal, signed-off reconciliation, and an explicit DNS cutover gate.

## Non-negotiable release invariants
- Bitcoin and Counterparty private keys remain exclusively with the user-controlled signer.
- No fabricated balances, transaction confirmations, market prices, or backing attestations.
- Financial operations fail closed if storage, network, authorization, or signer evidence is unavailable.
- Existing Cloud Run and Firestore remain operational until production parity and rollback are demonstrated.
- Keep Render staging protected; do not expose operator-only endpoints.
- GitHub PR review and green tests precede merge or deploy.

## Acceptance evidence
Record adapter unit tests, migration reconciliation report, security tests, API contract tests, Render service health, frontend connectivity, rollback rehearsal, and a named cutover approval. Missing evidence blocks release.
