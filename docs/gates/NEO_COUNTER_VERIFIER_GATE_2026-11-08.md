# NEO Counter read-only chain verifier gate

Date: 2026-11-08. Parent: PR #1351 (fe6e1b24e73ca04762207a52ddbd7ee7c0737d6a). This change is stacked on its SQLite allocation component.

## Verified developments

- PR #1349 and PR #1351 remained open/unmerged at inspection. PR #1351's six returned workflow runs completed successfully, including CI. PR #1349 Gateway CI was verified successful in the preceding gate.
- Counterpay's public `/v2/` and `/wp-json/` URLs returned HTTP 403 to this environment. This does not prove a node outage or identify the cause. Its own Bitcoin RPC and Counterparty connection remain unverified.
- A bounded GET of `https://api.counterparty.io:4000/v2/` returned HTTP 200, `network=mainnet`, `server_ready=true`, `ledger_state=Following`, and equal backend/Counterparty heights of 975042 at the check. This is the public API's reported state, not independent Bitcoin evidence.
- A bounded public sends sample with `verbose=true` exposed `msg_index`, integer `quantity`, `quantity_normalized`, `asset_info`, `destination`, `block_index` and transaction hash. Only schema/type information was retained; no wallet addresses or transaction contents were recorded in this gate.
- Reviewed official Counterparty OpenAPI and query source to confirm transaction-scoped sends and block routes.

## Implemented

Added server factories for a fixed-path HTTPS Counterparty v2 reader and a read-only checkout payment verifier. The latter accepts only trusted server-configured Bitcoin RPC and Counterparty readers; no public caller can select their URLs or credentials.

The verifier checks Bitcoin mainnet and initial-sync status; transaction identity, block membership, active block hash and confirmation count; then either a canonical BTC output or a valid Counterparty send with matching msg_index, asset, raw atomic quantity and destination. Counterparty and Bitcoin block identity must agree. An existing NEO Prime RPC inclusion verifier runs as the final read to detect changed inclusion. Normalized evidence feeds PR #1351's existing allocation boundary.

No new signing, broadcast, transfer, issuer authority or fulfillment permission is introduced. No HTTP allocation route or runtime configuration is enabled.

## Validation

- `npm run neo-counter:server:test`: all 28 tests passed, including 9 new verifier tests and the previous 19 backend tests.
- `node --test server/neo-prime/bitcoin-rpc-verifier.test.mjs`: all 7 shared inclusion-verifier tests passed.
- `git diff --check`: passed.
- Synthetic verifier-to-durable-allocation integration passed and rejected second-order reuse.

Tests cover wrong networks, lagging nodes, orphan/reorg evidence, wrong destination/asset/quantity, missing/ambiguous canonical send locator, divisible/indivisible quantities, satoshi precision, paginated or unavailable providers and missing trusted dependencies. These are source/integration tests with synthetic RPC responses, not a live Bitcoin payment or authenticated wallet checkout.

## Remaining dependencies and acceptance

1. Review PRs #1349 and #1351 and this stacked verifier change. Validate operator-selected provider versions against the strict schema before enabling staging.
2. Identify Counterpay's actual read-only Bitcoin RPC transport and Counterparty v2 endpoint through authorized configuration without exposing credentials. Do not replace the existing node with the public reference API based on this check.
3. Select/provision an isolated checkout runtime and storage without new spending. SQLite allocation is single-service; other adapters need equivalent atomic enforcement before use.
4. Wire server-authoritative merchant orders and vendor wallet addresses through the existing Crown authorization boundary. Browser return parameters and generic event-ledger rows remain insufficient proof.
5. Demonstrate NEOpass authentication, NeoMask explicit consent, vendor QR/address display, verified observation, atomic allocation and receipt in staging with synthetic or regtest-safe evidence. Current verifier is mainnet-only, so a synthetic trusted RPC harness is required for zero-value fixture tests; do not broadcast mainnet tests implicitly.

Status: BUILD and synthetic TEST complete. Live CONNECT, identity/wallet staging TEST and DEPLOY pending verified runtime/transport. No production changes, new spending or financial transactions occurred.

## Primary references

- https://docs.counterparty.io/docs/advanced/api-v2/node-api/
- https://github.com/CounterpartyXCP/counterparty-core/blob/master/openapi.json
- https://github.com/CounterpartyXCP/counterparty-core/blob/master/counterparty-core/counterpartycore/lib/api/queries.py
- Existing NEO source: server/neo-prime/bitcoin-rpc-verifier.mjs
