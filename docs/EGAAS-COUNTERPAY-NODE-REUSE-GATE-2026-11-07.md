# NEO eGaaS — reuse Counterpay's existing node

Project 144 · 2026-11-07 · Source-ready; deployed binding not established

## Direction

NEOsync identified Counterpay as the existing node connection. Reuse that protected backend connection for eGaaS; do not provision a replacement node or copy its credentials into a second service. Counterpay is the intended primary source. A second corroborating reader remains an independent evidence requirement in the current eGaaS verifier, not a demand to duplicate Counterpay infrastructure.

## Verified discovery

| Source | Observed evidence | Limit |
| --- | --- | --- |
| Public Counterpay | Fresh retrieval of `https://counterpay.holytemples.org/` and its public scripts returned HTTP 200. `retail.js` reads `/api/live/wallet?address=...`. The public integration page describes owner-side balance and confirmation reads. | This proves the public surface and advertised read route, not its node's identity, network, authorization or synchronization. No wallet was selected or queried. Blank wallet balances are not an outage finding. |
| WordPress domain configuration | The `counterpay` CNAME targets `custom-domains.chatgpt.site.`. No DNS change made. | A configured DNS record alone is not an operational node check. Direct DNS lookup in this executor was refused. |
| GitHub preview branch | `feat/counterpay-002-wallet-shell` contains `apps/counterpay/wallet-engine.mjs`, `bitcoin-readonly.mjs` and a loopback preview server. The wallet adapter's mainnet endpoint is `https://api.counterparty.io:4000/v2`; its Bitcoin UTXO adapter expects a separately supplied Esplora URL. | The deployed wallet is newer and materially different. Do not treat the preview branch as authoritative deployed configuration, or infer that its public Counterparty endpoint is an owned node. |
| Current Sites connection | Owned and editable Site lists and Counterpay content search did not expose the deployed Counterpay project. The owned list exposes NEO Operations Control Center, Noogle Connect and NEO Web. | Deployed source/runtime configuration is not accessible through this connection. No Site ID, private node origin, credential, or account ownership was inferred. |
| Operational register | Counterpay search returned no records. | Missing search results do not prove the node does not exist. |

The user's existing-node report is retained as operational direction. Its deployed connection remains to be inspected through the correct source/runtime access; absence from this workspace's inventory is not evidence that Counterpay lacks a node.

## Implemented reuse contract

`createEgaasCounterpayReview()` in `server/neo-platform-api/egaas-readonly-adapters.mjs` accepts a **trusted backend** object with:

- `network`: pinned to the approved eGaaS publishing policy.
- `bitcoinRpc`: the existing Counterpay read function; a local wrapper constrains requests to the same six read methods and parameter shapes as the earlier eGaaS adapter.
- `counterpartyReader`: the existing normalized reader with `network`, `nodeId`, `operatorId`, HTTPS `origin` and `read()`.

It makes no request during binding, constructs no replacement transport, copies no credentials, and preserves the existing reader's receiver when invoking it. The concrete Counterparty reader now exposes its pinned network so it can be reused without inferring network from an address or URL.

An independently configured corroborating Counterparty reader is optional for constructing the review object, but remains mandatory for an inclusion success. Duplicate configured node IDs, operator IDs or origins are rejected. A single Counterpay reader is retained explicitly and is never counted twice. Operator diversity is configuration evidence, not proof of physical independence.

The factory's `status` reports which callbacks are bound and always starts with `liveVerified:false`. Binding is not a live smoke test. `checkInclusion()` and `checkAuthority()` reuse the existing verifiers and cannot publish, sign or approve an individual root. Missing callbacks remain unconfigured; no URL is guessed and no browser wallet payload is accepted as a trusted reader.

## Validation and execution register

| Gate | Outcome |
| --- | --- |
| VERIFY | Live public Counterpay surface inspected; preview/deployed mismatch identified; correct source-access gap recorded. |
| CONNECT | Direct backend reader reuse contract implemented. Live node binding not performed because deployed connection is not accessible here. |
| BUILD | Reuse wrapper, pinned network metadata and five regression tests added. No node/service provisioned. |
| TEST | Tests cover direct callback reuse, no calls during construction, single-reader handling, duplicate-source rejection, network mismatch, missing bindings and a complete synthetic inclusion path. Positive chain data is mocked, not mined or published. |
| DEPLOY | No deployment, DNS mutation, source policy registration or production change. PR #1346 remains the review vehicle. |
| DOCUMENT | User direction, inspected evidence, source limits and live-binding requirements preserved here. |
| NEXT GATE | Access Counterpay's deployed Site/backend source in the selected workspace, locate its existing protected read connections, and supply those callbacks directly to this factory. Run network/sync and proof checks against actual responses. |

Live acceptance also requires an approved publishing policy, Crown capability introspection and root-bound approval before any future publishing, plus an independently identified corroborating source and a matching existing synthetic anchor transaction. None is invented by this gate.

To resolve the immediate access gap, make the deployed Counterpay Site/backend available to the current workspace, or supply its non-secret read-only node endpoint and service location. Do not provide passwords, tokens, keys, seed phrases or recovery words in chat. The public wallet URL alone does not reveal the protected backend node configuration.

No financial transaction, signing, issuance, new node provisioning or new hosting spend occurred.

Validation: the existing full eGaaS/platform, storage, Crown integrity/auth and Bitcoin verifier command passed **129 tests, 0 failures**. `git diff --check` passed. The five new tests use synthetic callback fixtures and do not establish a live Counterpay binding.
