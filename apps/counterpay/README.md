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

## COUNTERPAY-006: Bitcoin observations and fee preview
- `bitcoin-readonly.mjs` validates Base58Check/SegWit checksums for configured mainnet or testnet addresses, using WebCrypto.
- A **user-supplied HTTPS Esplora-compatible Bitcoin indexer URL** is required for UTXO observations. The returned list distinguishes confirmed from unconfirmed outputs. Indexer trust, endpoint/network matching and chain-tip consensus are **not independently verified**.
- A user-supplied HTTPS fee endpoint can return common mempool-style sat/vbyte estimates. No fee is guaranteed; source freshness is not attested.
- The Overview now exposes read-only UTXO and fee requests and shows the returned provider data.
- No secure coin selection, transaction serialization, PSBT construction, device signing, NEO Pass authorizations, broadcast, or private credentials are present. No real spend authorization can occur.
- Checksum validation does not prove address control. Validate provider identity, TLS and network independently before relying on observations.

## COUNTERPAY-007: deterministic funding preview (NOT a PSBT)
- `bitcoin-funding.mjs` selects from confirmed, supplied UTXOs deterministically and calculates a conservative *illustrative* P2WPKH funding, estimated fee and change plan.
- The current planner does not check recipient/change address checksums, scripts, UTXO provenance or input ownership; only trusted test fixtures should be used. No output is a valid transaction.
- The device-review object is **display only**. It does not create a passkey challenge, fingerprint assertion, signature, PSBT or spend authorization.
- The UI permits inspecting an estimated funding plan after UTXO and fee observations, but its output must **never** be supplied to a live broadcaster or signer.
- For a real PSBT milestone: checksum/network validate both output addresses; obtain verified scriptPubKeys, UTXO amounts and confirmation proofs; apply script-aware weight/dust/fee calculations; serialize BIP174-compliant unsigned PSBT with an audited Bitcoin library; round-trip decode and assert every input, output, change, network and maximum fee; keep external signing disabled pending independent security review.
- Tests: `node --test apps/counterpay/*.test.mjs` (CI configured, execution outcome not yet confirmed).

## COUNTERPAY-008: PSBT builder (unreviewed prototype)
- `psbt-builder.mjs` uses pinned `bitcoinjs-lib@6.1.7` to generate an **unsigned BIP174 PSBT** with P2WPKH witness UTXOs and explicitly specified payment and optional change outputs.
- It validates recipient/change address checksums and intended network, enforces the caller-supplied maximum fee, refuses duplicate outpoints and unsuitable scripts, and decodes its resulting PSBT to compare outputs.
- All source UTXO values, confirmations and scriptPubKeys are **caller assertions**, NOT verified blockchain proofs. It does not prove input ownership, authenticate a node, verify chain state, ensure fee-rate optimality or guarantee spendability.
- No external signer, WebAuthn passkey, device approval, Crown Chain attestation, finalization, mainnet broadcast or production wallet UI action is wired to PSBT output.
- Tests are in `psbt-builder.test.mjs`. CI installs dependencies in this app then runs all `*.test.mjs`. The output MUST be reviewed before merging.
- A full integration security review is required before offering PSBT output to any external signer: bind trusted chain/network data, validate prevout script and amount against authoritative sources, validate change ownership from authenticated wallet descriptors, and reject policy deviations.

## COUNTERPAY-008 security hardening
- The existing BIP174 unsigned PSBT builder uses pinned `bitcoinjs-lib` 6.1.7, supports native P2WPKH UTXO input metadata and round-trip output checks, and does not expose signing or broadcasting.
- **New fail-closed gate:** every PSBT input must be independently attested by caller-supplied async `verifyInput(input)` returning true. Missing or failed verification aborts construction. A permissive verifier in unit tests is a fixture **not suitable for deployment**.
- The verifier has **not** yet been integrated with an independently trusted Bitcoin node/UTXO proof service or ownership descriptor. This code must remain disabled for mainnet use.
- A PSBT alone is not device authorization. NEO Pass/WebAuthn and signing contract remain separate, unimplemented security gates.

## COUNTERPAY-009: NEO Pass review request and Crown Chain commitment
- `device-review.mjs` creates a SHA-256 PSBT commitment, binds it to a short-lived nonce, expected HTTPS origin, network, fee and outputs.
- `verifyAuthorizationReceipt` checks **only metadata equality and freshness**, returning `cryptographicallyVerified:false` and `bitcoinAuthorized:false`. It is *not* a WebAuthn verification implementation or authorization decision.
- `crownEvidenceForReview` records an unanchored, unattested evidence descriptor. It is not an on-chain Crown Chain transaction.
- A cryptographically strong nonce **must be generated by a trusted server** and checked in a one-time-use challenge store. The current API accepts caller-provided nonce and does not prevent replay independently.
- Production requires RP ID/credential registration and trusted WebAuthn verification, nonce persistence, attested UTXO proofs, PSBT confirmation UI, hardware signer integration, and full signing/audit/security review. Signing and broadcast remain disabled.

## COUNTERPAY-010: one-time device approval orchestration (integration required)
- `webauthn-coordinator.mjs` issues server-generated 256-bit random nonce challenges with 2-minute expiry, PSBT SHA-256 binding and expected HTTPS origin/RP ID.
- Requests are atomically consumed before checking verifier results in the store contract; challenges are single use, even after failed verification.
- The included in-memory store is **only for tests or isolated development**, not durable, distributed, or production safe.
- `verifyWebAuthn` is an **injected trust dependency**, not yet implemented. A production handler must use a reviewed WebAuthn library, persisted registered public keys/credential IDs/signature counters, strict RP ID, origin, challenge and user-verification checks, and a shared atomic TTL storage backend.
- A caller could inject a dishonest verifier; therefore the coordinator is NOT an authentication security boundary until it is owned by a trusted backend with audited verification and identity binding.
- Approval is **not** equivalent to a Bitcoin transaction signature. Bitcoin signing, PSBT finalization, Crown Chain anchoring and broadcasting remain disabled.

## COUNTERPAY-011: real WebAuthn verification integration
- Server-only `webauthn-verifier.mjs` uses pinned `@simplewebauthn/server@14.0.3` to validate challenge, origin, RP ID, credential public-key signature, and user verification.
- Credential records MUST come from trusted persistent registration and be scoped to the authenticated user. Credential counter persistence must use atomic compare-and-swap, including an explicit policy for zero-counter authenticators.
- `webauthn-persistence.mjs` provides a Redis adapter that requires atomic SET NX PX and GETDEL for one-time challenges; configure real Redis and credential storage before deployment.
- The coordinator's `verifyWebAuthn` dependency can now be supplied by `createWebAuthnVerifier({credentialRepository})` **only within a trusted server runtime**. It is not wired to production HTTP routes, registered NEO Pass devices or an operational backend.
- This gate does not establish ownership of Bitcoin keys, device-bound signing, transaction authorization, Crown Chain anchoring or broadcast.
- `npm install --prefix apps/counterpay && node --test apps/counterpay/*.test.mjs` requires verification in CI. No production rollout without reviewing CI, WebAuthn registration and live-device tests.

## COUNTERPAY-012: enrollment and read-only session service contracts
- `enrollment-session.mjs` provides server-only begin/finish registration with random one-time challenges, user-ID binding, two-minute expiry and a required trusted registration verifier.
- Credential persistence is injected; it must be durable, atomically reject duplicate credential IDs, and bind each credential to a previously authenticated user.
- Sessions are restricted to `wallet:read`, expire in fifteen minutes, and support explicit revocation.
- **Security requirement:** a service caller must never construct or pass arbitrary authentication objects to session creation. Only a server-verified assertion result retrieved from the trusted coordinator and bound to the same user is acceptable. HTTP routes, account authorization middleware, cookie security, CSRF defenses, rate limiting, production credential registration, trusted verifier configuration and durable stores are not built yet.
- The session token is a bearer secret; do not expose it in logs, URL parameters, browser localStorage or screenshots. Server-side session cookies should be HttpOnly, Secure and SameSite restricted.
- Tests use simulated repositories and registration verification; these do not demonstrate live passkey enrollment or cryptographic device verification.
- Bitcoin signing, approval-to-wallet-key binding and broadcasting stay disabled.

## COUNTERPAY-013: runnable local preview gate
- From `apps/counterpay` run `npm install` then `npm run preview`; visit `http://127.0.0.1:8080` on the **same computer**. The server deliberately binds only to loopback and is not accessible directly from a phone or public internet.
- `GET /api/health` returns `preview-only`; other `/api/*` routes fail closed. There is NO NEO Pass login API, no production credential store, no authenticated wallet session route, and no signing or broadcast.
- A dedicated smoke test ensures the preview serves the UI, rejects auth/transfer calls and does not serve arbitrary repository files.
- Before a private HTTPS deployment: implement reviewed registration/authentication HTTP handlers, trusted server identity binding, persistent session/challenge and credential storage, CSRF/rate limiting, secure cookies, correct browser WebAuthn ceremony, and private ingress. Never expose this local server directly to the internet.
- Some read-only Counterparty/Bitcoin browser calls may require CORS and trusted proxy configuration. Current test status and deployed URL require separate verification.
