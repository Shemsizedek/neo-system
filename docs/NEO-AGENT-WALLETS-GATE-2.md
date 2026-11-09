# NEO agent wallet participation — Gate 2

Date: November 8, 2026 (America/Chicago). Owner: NEOsync. Depends on Gate 1 / PR #1380.

## Outcome

Use existing compatible Bitcoin/Counterparty wallets rather than building a wallet per bot. The proposal register now records a provider label and explicit ledger choice. Existing worker IDs and operator references remain separate: multiple bots can belong to the same operator. Provider labels describe the supplied address; they are not proof of installation, wallet control, custody or compatibility.

| Field | Accepted values / purpose |
| --- | --- |
| provider | `existing-wallet`, `freewallet.io`, `xcp-wallet`, `counterpay`, `other-counterparty-wallet` |
| protocol | `bitcoin` or `counterparty` |
| ledger (Bitcoin) | `bitcoin` |
| ledger (Counterparty) | `unverified`, `counterparty-2.0`, `counterparty-classic` |
| address | Existing Gate 1 legacy mainnet P2PKH checksum validator; other formats deferred |
| ownerId | Operator reference; not a wallet-control proof or an independent beneficial-ownership check |

Omitting a Counterparty ledger leaves it `unverified`. No ledger is guessed from an address. No provider is mandatory, and Counterpay is retained as the preferred NEO integration label. A supported provider label never activates payments or order placement.

## Verified provider evidence

Read November 8, 2026:

- https://freewallet.io/ describes Bitcoin/Counterparty support and multiple addresses, and distinguishes Counterparty 2.0 from Classic. Its desktop and mobile versions have different release histories. Website evidence does not verify a locally installed wallet or provider API readiness.
- https://www.counterparty.io/ lists Freewallet and XCP Wallet as wallet options. It describes XCP.io in the explorer section.
- https://xcp.io/ presents an explorer and links to XCP Wallet. It was not established as an address-issuance API.

An address can be acquired in an existing wallet, but an address alone does not establish signing authority, matching ledger support or funds for fees. No account signup, installation, seed generation, key access, funding or trading occurred in this gate.

## Market participation implementation

The existing `server/neo-router-market/fabric.mjs` already rejects identical owner IDs. Gate 2 extends its pure routing functions with an optional trusted server-side `resolveControlGroup(principalId)` resolver. When supplied, the requester must resolve to a non-empty control group; book rows and RFQs must resolve to an independent group. Distinct bots under one owner cannot supply liquidity to each other. Unattributed counterparties are excluded in this mode. An independent RFQ can still serve a request when book liquidity is excluded.

The resolver must come from independently verified operator/control records. Never expose it as request-supplied data or derive independence merely from two different addresses, claimed owner strings, or wallet providers. Existing calls without a resolver preserve the earlier owner-ID behavior. Production HTTP routes have not been wired to this new mode; these tests establish local behavior only. Execution-time checks, live order cancellation and reconciliation still need review before a market-making deployment.

Internal work references remain separate from market trade volume. New addresses, wallet-to-wallet transfers and trades among commonly controlled bots must not be presented as independent community demand. A future pilot should measure independent counterparties, executable depth, spread, externally settled fills and fees. Live market making requires approved assets, inventory, capital/fee limits, venue access, wallet control, legal/compliance validation, and an execution-time common-control check.

## Gate register and next milestone

| Phase | Result |
| --- | --- |
| VERIFY | Wallet/explorer sources and existing Router market controls inspected. |
| CONNECT | Provider/ledger metadata added to offline enrollment; no live provider API connection established. |
| BUILD | Existing-wallet labels and optional attributed book/RFQ routing implemented. |
| TEST | Focused enrollment, worker, market-router and OMS suites; see PR for exact command and results. |
| DEPLOY | Review branch only; no production activation. |
| DOCUMENT | Provider evidence, dependencies and limitations recorded here. |
| NEXT GATE | Verify an operator-controlled public address and Counterpay's actual ledger; then implement reviewed private durable enrollment and control-proof verification. |

Gate 1 remains a separate unmerged dependency at the time this document was written. No live wallet has been assigned. Pending bindings remain unsigned proposals. Durable enrollment, recovery and authenticated control proofs are still outstanding, not complete.
