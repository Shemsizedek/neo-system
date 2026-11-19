# NEO eGaaS — read-only node adapter gate

Project 144 · 2026-11-07 · Feature-branch source; no deployment

## Result

Concrete HTTP adapters now replace the previous normalized-reader placeholders. `createEgaasReadOnlyReview()` wires operator-provisioned Bitcoin, Counterparty and Crown configuration to the existing authority and inclusion checks. An empty configuration makes no connections and reports unverified. No startup configuration, identity policy, publishing scope or deployed service is changed.

| Component | Behavior |
| --- | --- |
| Bitcoin Core | JSON-RPC POST with response-ID validation and only six allowed read methods: `getblockchaininfo`, `getblockheader`, `getrawtransaction`, `getblockhash`, `gettxoutproof`, `verifytxoutproof`. Method-specific parameters are checked before a request. Wallet, signing, mining and broadcast methods are rejected. |
| Counterparty Core v2 | GET `/v2/` for ready/network/height state, `/v2/broadcasts/{tx_hash}` for the valid parsed broadcast, and `/v2/blocks/{height}` for anchor/tip hashes. Rechecks readiness and tip to reject moving or inconsistent snapshots, then emits the previous internal observation contract. |
| Crown | Reuses `verifyCrownAuthorization()` via POST `/api/v1/trust/verify` only. No challenge, enrollment, key access, token issuance or signing request. Scoped authority still does not approve an individual batch root. |
| Expiry compatibility | The existing Crown interface tests use numeric Unix-second expiry values. The eGaaS checker now accepts valid Unix seconds and ISO timestamps, rejecting expired values, numeric strings and millisecond-valued numbers. No existing Crown policy or shared verifier is modified. |
| Transport | Trusted origins configured once, no embedded URL credentials/query/fragment/path, no redirects or browser cookie propagation, four-second abort signal and 2,100,000-byte streamed response cap. HTTPS required; explicitly opted-in loopback HTTP is available only for protected local Bitcoin RPC. Errors do not reflect upstream response bodies. |

No network URL, credential, callback or publishing policy is accepted through a public API request. Protected authentication is injected only by trusted runtime construction; no live credentials were read or requested in this gate. `createEgaasReadOnlyReview()` snapshots policy rather than retaining a mutable caller-owned policy object.

These adapters support the existing explicit `mainnet`, legacy `testnet` and `signet` policy names; they do not silently map `testnet4` or migrate the production chain. Server network mismatches fail. Current Counterparty documentation also lists testnet4, which needs a separately reviewed network mapping if selected in future. Mainnet remains the user's production direction; the signet fixtures are tests only.

## Verified source evidence

The official Counterparty OpenAPI document retrieved for this gate reports API version **11.5.0**. Its examples define:

- `/v2/`: `server_ready`, `network`, `backend_height`, `counterparty_height`.
- `/v2/broadcasts/{tx_hash}`: `tx_hash`, `block_index`, `source`, `text`, `status`.
- `/v2/blocks/{block_index}`: `block_index`, `block_hash`.

These fields/routes were cross-checked against the official reference source at commit `8aab989157019e62423cd959b8571c7daf748d56`, especially `lib/api/routes.py`, `queries.py` and `apiserver.py`. The upstream snapshot is evidence, not a bundled runtime dependency. Tests reproduce only the minimal response shapes required by this integration.

References:

- https://github.com/CounterpartyXCP/counterparty-core/blob/8aab989157019e62423cd959b8571c7daf748d56/openapi.json
- https://github.com/CounterpartyXCP/counterparty-core/blob/8aab989157019e62423cd959b8571c7daf748d56/counterparty-core/counterpartycore/lib/api/routes.py
- https://docs.counterparty.io/docs/advanced/api-v2/node-api/
- https://bitcoincore.org/en/doc/30.0.0/rpc/blockchain/verifytxoutproof/

## Execution and evidence limits

The HTTP-shaped integration test runs the actual new adapters through the existing Bitcoin/Merkle and two-Counterparty inclusion verifier. All positive authority/inclusion cases use mocked HTTP responses. The synthetic header is not a mined block, the fixture transaction is not broadcast, and the capability is not live authorization.

A single read-only readiness request to the official public reference `https://api.counterparty.io:4000/v2/` returned `UNAVAILABLE_FROM_THIS_ENVIRONMENT` after the bounded attempt. No successful node readiness, two-provider independence, live Crown authority or receipt inclusion is established. That reference endpoint is not installed as a production configuration. No second provider was invented or automatically trusted.

Previous gates established that the inventoried BVM staging source has Bitcoin execution disabled. That configuration remains unchanged. This gate does not enable RPC on the public staging shell.

Run:

```sh
node --test server/neo-platform-api/*.test.mjs server/crown-metadata/integrity.test.mjs server/neo-storage/fabric.test.mjs server/neo-prime/bitcoin-rpc-verifier.test.mjs server/crown-auth/verify.test.mjs
node scripts/egaas-synthetic-gisd-gate.mjs
```

Validation: **124 tests passed, 0 failed** for the full command above; `git diff --check` passed. The previously verified synthetic custody demo remains unchanged in this gate.

## Gate register

| Gate | Outcome | Remaining dependency |
| --- | --- | --- |
| VERIFY | PR #1346 remains open/mergeable as observed; official Core routes and existing Crown expiry representation inspected. | Maintainer review of the complete PR. |
| CONNECT | Concrete transport constructors and read-only review factory implemented; no live runtime configuration enabled. | Reachable protected Bitcoin RPC, approved publisher/network/manifest, existing Crown capability and two independently operated Core origins. |
| BUILD | Bitcoin/Counterparty/Crown adapters and Unix-expiry correction completed. | Root-bound publishing approval remains a separate implementation. |
| TEST | Response normalization, methods/parameters, ID correlation, malformed/oversized/error responses, snapshots, expiry compatibility and full fixture path covered. | Actual live responses remain unverified. |
| DEPLOY | No deployment or production configuration mutation. | Reviewed staging activation and smoke checks. |
| DOCUMENT | Source provenance, transport boundaries, network limits and remaining blockers recorded. | Operational owner acceptance. |
| NEXT GATE | Configure this factory in an approved protected staging runtime, verify public readiness, then verify an independently provided existing synthetic anchor transaction. | Publishing a new transaction still requires root approval and a separate fee-bearing action. |

No new spending, real records, key custody changes, financial transaction, signing or broadcast occurred.
