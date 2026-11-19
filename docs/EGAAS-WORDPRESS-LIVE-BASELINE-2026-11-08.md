# NEO eGaaS — authenticated WordPress access and live node baseline

Project 144 · 2026-11-08 · Read-only verification; no production changes

## Verified in this gate

| Check | Observed result | Scope |
| --- | --- | --- |
| WordPress | `holytemples.org`, site ID 241770410, active Atomic site; site-scoped MCP available. | Authenticated inventory read succeeded. |
| WPVibe | Authenticated `site_info`, plugin list, source-file reads and REST reads succeeded for `holytemples.org`. | Read scope verified; publishing and uploads not tested. |
| GitHub | PR #1346 is open, unmerged; head observed before this gate: `62ce042a6ff489627a9465d87edb59822ff75dc5`. | Source read/write review path available. |
| CounterPay WordPress Bridge | Active plugin version 0.2.0; source inspected through WPVibe. | Checkout handoff, not a Bitcoin Core RPC or generic node proxy. |
| NEO Counter | Active version 0.21.0; `GET /neo-counter/v1/settlement-status` succeeded. | Reports transactional invoice storage ready, three required confirmations, payments disabled and automatic delivery false. No order/claim/transaction was queried or changed. |
| CounterPay wallet | Public `https://counterpay.holytemples.org/api/health` responds with service CounterPay, version 0.12.0. | Application health/capability report; does not prove signing operation, key control or node synchronization. |
| Counterparty Core | `https://api.counterparty.io:4000/v2/` returned version 11.5.0, network mainnet, `server_ready:true`, `ledger_state:Following`, backend and parser heights both 975031. | Live provider readiness snapshot, not permanent uptime or node ownership. |
| Canonical block cross-check | Counterparty block 975031, Blockstream's height lookup and mempool.space's height lookup return the same hash below. | One-height agreement among one Counterparty parser and two Bitcoin index providers. Not two independent Counterparty parsers or a Bitcoin Core transaction proof. |

Verified block hash at height **975031**:

`0000000000000000000088a88ddf525eee8562ee56b0a1ce78b5cc369306eb21`

## Deployed source tracing

WPVibe read the installed plugin files; known secret patterns were redacted by the provider. These reads are source evidence, not byte-exact copies suitable for republishing.

- `plugins/counterpay-bridge/counterpay-bridge.php`: checkout snapshots specify Bitcoin mainnet / cp20 and send approved invoices to `counterpay.holytemples.org`. No node-read route is exposed by this bridge. Its order-request POST and token-bearing invoice GET were not invoked.
- `plugins/neo-stewardship-counter/token-settlement.php`: cp20 readiness and token verification use the fixed `https://api.counterparty.io:4000/v2/` source and require mainnet and Following. A separate Classic ledger path exists; its credentials were not inspected, and it is not substituted for cp20 or treated as a second cp20 corroborator.
- `plugins/neo-stewardship-counter/settlement.php`: Bitcoin transaction evidence uses `https://blockstream.info/api` and `https://mempool.space/api`, comparing canonical block/transaction observations. No protected Bitcoin Core RPC connection is established by these inspected functions.

This confirms the WordPress CounterPay/NEO Counter checkout data path. It does not establish that Counterpay's separately hosted wallet uses identical backend configuration. The public wallet is routed through Sites: WordPress's configured `counterpay` CNAME still targets `custom-domains.chatgpt.site.`. The deployed Counterpay Site is not in the current owned/editable Sites inventory, so its protected runtime readers are not yet available for direct binding. WordPress access is working; wallet-runtime access is a separate surface.

## Retrieval constraints resolved

WPVibe's rendered-page reader successfully retrieved public node readiness and Bitcoin index hashes. Its cache-busting query parameter caused Counterparty's strict block route to reject that particular request with `Unrecognized parameter(s): wpvibe_cb`. A direct fresh public scrape of the same exact block URL returned HTTP 200 and the matching block data. This was a retrieval-client incompatibility, not evidence of a Counterparty outage. No production proxy or cache policy was changed.

Primary live URLs:

- https://counterpay.holytemples.org/api/health
- https://api.counterparty.io:4000/v2/
- https://api.counterparty.io:4000/v2/blocks/975031
- https://blockstream.info/api/block-height/975031
- https://mempool.space/api/block-height/975031
- https://holytemples.org/wp-json/neo-counter/v1/settlement-status

## Source improvement

The eGaaS Counterparty adapter now requires exact `ledger_state:Following` as well as server readiness, intended network and matched parser/backend heights. Missing, rebuilding or other ledger states fail even when `server_ready` is true. This matches both the live provider response and the deployed WordPress verifier. A regression test covers contradictory/missing state; fixtures now use the observed response shape. No production adapter was deployed.

## Gate register and remaining acceptance

| Gate | Status |
| --- | --- |
| VERIFY | WordPress, WPVibe and GitHub access confirmed; deployed checkout plugin source inspected. |
| CONNECT | Existing cp20 source identified and reached through read-only retrieval; no new node created. |
| BUILD | Adapter readiness condition tightened to match the deployed Following requirement. |
| TEST | Live one-height block agreement obtained; existing full test command rerun with new readiness regression. |
| DEPLOY | PR-only source change; no production write, DNS change, plugin update or deployment. |
| DOCUMENT | This evidence distinguishes verified live reads from runtime binding and receipt-proof gaps. |
| NEXT GATE | Obtain Counterpay's protected wallet runtime reader binding, a separate cp20 corroborator and Bitcoin Core proof access; then verify a matching existing synthetic anchor transaction and approved Crown policy. |

The current eGaaS inclusion gate still needs `gettxoutproof`/`verifytxoutproof`, two independently configured cp20 observations, the approved publisher/manifest and Crown authority. None is waived by readiness or one-height agreement. No synthetic anchor transaction ID was supplied or created, so receipt inclusion remains unverified. Existing direct Counterpay reuse support in PR #1346 remains the intended binding path.

No invoices, orders, payments, wallet balances, private records, signing keys or live credentials were read. No transaction was composed, signed, issued or broadcast. No spending or production changes occurred.

Validation result: **130 tests passed, 0 failures** for the full platform/eGaaS, Crown integrity/auth, storage and Bitcoin verifier command used in the previous gate. `git diff --check` passed. The three-source block-hash equality was also checked programmatically against the retrieved public responses.
