# CounterPay — NEO Systems for the Counterparty community

CounterPay is an independent community wallet initiative by NEO Systems. This implementation is a **read-only preview**, not a secure signing wallet and not a replacement for Counterwallet yet.

## Preview
Open `index.html` from a local static server (for example `python3 -m http.server 8080` in this directory), then visit http://localhost:8080. Network/API CORS and provider availability depend on the selected endpoint.

## Implemented
- Responsive, keyboard-accessible wallet navigation (overview, assets, payments, DEX, Crown Chain).
- Public address lookup of Counterparty asset balances using REST API v2, on a best-effort basis.
- A local, unsigned payment request preview that **cannot execute**.
- Network selector and noncustodial/read-only safety messaging.
- Text-only rendering of returned asset records (no HTML injection).

## Deliberate limitations
- No wallet creation, import, seed phrase collection, private key management, hardware signing, Bitcoin balance indexer, PSBT, XCP composition, broadcast, swap or escrow.
- Public-address validation is only a superficial format check, not a checksum or network-specific proof; **never rely on it for sending funds**.
- The API endpoints and balance response must be verified against current Counterparty documentation and tested on each network; CORS may block browser calls.
- No portfolio USD value is reported because reliable market quotes and Bitcoin balance providers are not wired up.
- Crown Chain is a proposed optional application/service layer; the preview does not imply protocol consensus, finality or custody guarantees.
- Mainnet selection remains read-only. No API key should be inserted in browser code.

## Next implementation checks
1. Contract tests for Counterparty Core v2 against a controlled indexer/proxy, verify endpoint shapes and network configuration.
2. Address checksum/network validation; asset precision and pagination.
3. Independently sourced BTC UTXO indexer and confirmation accounting.
4. Signing threat model, hardware wallet support, audited compose/PSBT flow; testnet first.
5. Licensing review of historical Counterwallet code prior to reuse; community feedback.
6. Security review, browser smoke test, usability/a11y testing, CI and preview deployment.

Upstream references: https://github.com/CounterpartyXCP/counterwallet and https://github.com/CounterpartyXCP/counterparty-core .


## COUNTERPAY-004: transaction inspection preview
- `transaction-planner.mjs` creates **non-executable transfer intents** and read-only DEX inspection descriptors.
- `evidenceEnvelope` generates an **unattested, unanchored, unsettled** Crown Chain evidence envelope.
- The Payments UI displays the intent/evidence package; it does not compose a PSBT or Counterparty payload.
- Run `node --test apps/counterpay/*.test.mjs` from repository root.
- Public address checks are format-only and are not checksum validation. Do not use this UI to authorize funds.
- Live DEX orderbook queries, API compose integration, signing, proof hashing, broadcast and network deployment remain **not implemented**.

## COUNTERPAY-005: read-only market bridge and evidence hashing
- `market-bridge.mjs` adds documented Counterparty API v2 pair-order and asset-dispenser GET requests, with readiness handling.
- The DEX panel can request public order/dispenser snapshots and show up to 20 raw records. It does not place orders; further pagination and structured market rendering remain to be built.
- `composeSendRequest` **constructs a URL descriptor without requesting the compose endpoint**. Quantity precision and actual spendability must still be checked against asset metadata and node state.
- `hashEvidence` creates a deterministic SHA-256 digest of an unattested Crown evidence envelope. A hash is **not** a signature, notarization, Bitcoin anchor, or proof of ownership.
- Unit tests added for markets, previews and evidence hashing. CI automatically includes `*.test.mjs`; GitHub Actions outcomes and deployed-browser behavior must be inspected separately.
- Bitcoin fee estimates, verified UTXOs, a signing policy, actual Crown anchors and transaction broadcasting are deliberately not implemented.
