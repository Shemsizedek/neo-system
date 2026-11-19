# NEO eGaaS — Bitcoin proof preparation gate

Project 144 · 2026-11-07 · State: source implementation, not deployed

## Architecture and evidence

| Layer | Responsibility | Evidence / limit |
| --- | --- | --- |
| Bitcoin — L1 | Settlement and transaction inclusion | No Bitcoin node synchronization or anchor transaction verified in this gate |
| Counterparty — NEO L2 designation | Bitcoin-based protocol for a proposed commitment broadcast | Official protocol supports textual broadcasts; no compose, signing or broadcast invoked |
| NEO Crown Chain — NEO L3 designation | eGaaS application policy, batching, authority and proof presentation | Existing Crown Merkle code reused; no independent consensus or inherited finality claimed |
| NEOpass | Authenticate preparation requests | Existing platform subject resolver reused; no identity permissions changed |
| eGaaS | Government, school and CRM workflows | Existing portal source inspected; this gate adds proof preparation, not new record storage |

L2 and L3 identify the NEO architecture. These names alone do not establish a rollup, decentralized validator network, or additional Bitcoin consensus guarantees.

## Implemented contract

`POST /api/v1/egaas/anchors/prepare` requires the existing verified NEOpass session and `application/json`. Input is exactly `{ "commitments": ["<64 lowercase hex characters>"] }`, with 1–128 unique commitments and at most 12,000 request bytes. No record bodies, citizen IDs, student IDs, wallet addresses or authority claims are accepted. This is a pure computation endpoint; it writes nothing and calls no external service.

Before calling, the record owner must privately construct each commitment as SHA-256 over a documented, versioned byte encoding containing a fresh cryptographically random 32-byte nonce and the canonical record bytes. Preserve the nonce, encoding version and record privately under access control. The endpoint cannot determine whether a submitted digest is properly salted: never send unsalted low-entropy personal-data hashes. Canonical record encoding and custody integration remain the next implementation gate; this API accepts precomputed commitments only.

Merkle algorithm: reuse `server/crown-metadata/integrity.mjs`. Each asset identifier is `neo-egaas-anchor-v1:<commitment>`, with the commitment also supplied as its content hash. Leaves use Crown's `NEO-CROWN-METADATA-V1` domain, sorted by asset; parent hashes use concatenated binary digests and duplicate the final leaf at odd levels. Returned proofs use left/right sibling hashes. This explicitly reuses the existing algorithm rather than inventing a second tree format.

The response contains the root, membership proofs and proposed text `NEO:eGAAS:1:<root>`. This text is an application envelope, not serialized Counterparty transaction data. Every response has `prepared_offchain`, `anchored: false`, `crownAuthorized: false`, `broadcastEnabled: false`, and `transactionId: null`. Proof membership does not prove identity, issuer authority, record truth, issuance, or blockchain inclusion. No confirmation API is supplied yet.

## Execution register

| Gate | Outcome / acceptance |
| --- | --- |
| VERIFY | Repository access confirmed; eGaaS and Crown source inspected. Render inventories locate platform recovery and BVM staging services; listing is not an uptime test. Live eGaaS health, Bitcoin/Counterparty sync and Crown quorum remain unknown. |
| CONNECT | Uses existing NEOpass resolver and Crown integrity module; no new credential or provider dependency. |
| BUILD | Preparation module and platform route implemented; no financial execution or record persistence. |
| TEST | `node --test server/neo-platform-api/*.test.mjs server/crown-metadata/integrity.test.mjs`: 90 passed, 0 failed. Tests cover membership/tampering, ordering, input limits, authentication and HTTP errors. |
| DEPLOY | Feature branch/PR only. Maintainer review and staging integration precede deployment. Rollback is to revert this PR; no schema or migration involved. |
| DOCUMENT | This contract and register accompany the code. Proposed owner: NEO Core/Crown; school record policy: GISD operator. |
| NEXT GATE | Add a private record-to-salted-commitment adapter and durable outbox, approved Crown capability scope, and read-only two-node inclusion/reorganization checks before considering transaction composition. |

## Blockers and review decisions

Read-only HTTP probes to `https://neo-platform-api-recovery.onrender.com/health` and `https://neo-bvm-144-staging.onrender.com/health` each exceeded a 15-second request timeout in this execution environment. No successful response was obtained. This is inconclusive about service availability and does not establish an outage or a healthy deployment.

1. Verify the current deployed Crown runtime and authority contract; inventory includes separate cardmaster services but does not establish the signer authority or chain anchoring service.
2. Identify approved Counterparty nodes, publishing address, Bitcoin network and confirmation policy. Match the verified Counterpay configuration before implementation; do not infer mainnet connectivity from a hostname.
3. Select the first record workflow. Recommended: a synthetic GISD completion receipt, followed by a reviewed non-personal public document. Real student data requires private nonce/record custody and retention controls first.
4. Confirm who may approve publishing a root, the required quorum, fee limits, and recovery/rollback procedures. No approval or transaction authority is created by preparing a proof.
5. Verify staging sessions and real service health, backup restoration and proof persistence. A free-hosting inventory entry does not establish continuous availability.

## Primary references

- Counterparty broadcast semantics: https://docs.counterparty.io/docs/advanced/protocol/
- Counterparty API v2: https://docs.counterparty.io/docs/advanced/api-v2/node-api/
- API migration mapping (compose vs read endpoints): https://docs.counterparty.io/docs/advanced/api-v2/v1-to-v2/
