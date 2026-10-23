# NEO-CLOUD-002 - Authenticated sandbox evidence gate

## Release position

This is an implementation and validation candidate for the existing NEO Cloud Miner release (#1200). It does not purchase hashpower, accept a customer payment, mint a token, broadcast a transaction, or change the published web/Android application.

A passing unit test is NOT an authenticated provider integration. The real gate stays BLOCKED until both the authenticated provider/order check and the independent Counter test-payment check succeed with genuine operator-provisioned evidence. No physical ASIC owned by NEOsync is needed for this cloud-provider integration.

## Project register and architecture

| Workstream | Ownership / dependency | Implemented boundary | Unverified prerequisite |
|---|---|---|---|
| Provider account | NEOsync / authorized provider account operator | Existing GET-only NiceHash client; strict response checks and selected SHA256 order membership | Real sandbox credentials and selected order |
| Generator diagnostic | Project 144 / existing Generator runtime | GET /sandbox/status, separate 64-hex read token, no browser-origin requests or query credentials | Runtime secret binding and authenticated smoke test |
| Counter evidence | Counter merchant operator / private invoice store | Exact-byte HMAC candidate verifier bound to merchant, customer, order, provider order and amount | Counter-side candidate emitter is NOT wired into its current receipt/event service |
| Independent observer | Server-side verifier / Blockstream testnet3 Esplora | Matching output script and integer satoshi amount, confirmations, canonical block check, transaction recheck | Genuine testnet3 payment to an authorized test invoice |
| Duplicate protection | Operator / durable single-host sandbox volume | Atomic SQLite uniqueness for order, receipt and transaction output | Persistent host volume; not a multi-instance production database |
| Production commerce | Separate compliance, provider resale and settlement gates | Always disabled, even if this sandbox gate passes | Not in this release |

Architecture: trusted Counter invoice + signed candidate -> Generator verifier -> fixed read-only testnet3 observer -> isolated evidence ledger. Provider account reads are a separate prerequisite. This is an operator diagnostic, not a second checkout provider.

## Configuration

Provider secrets (backend secret manager or protected GitHub Environment only):

- NICEHASH_TEST_API_KEY
- NICEHASH_TEST_API_SECRET
- NICEHASH_TEST_ORGANIZATION_ID
- NICEHASH_TEST_ORDER_ID (selected existing order UUID; no order creation is performed)

Set NEO_CLOUD_SANDBOX_ENABLED=true only in the intended test runtime. For GET /sandbox/status also set NEO_CLOUD_SANDBOX_READ_TOKEN to a dedicated 64-character lowercase hexadecimal random token, distinct from provider/Counter credentials. Keep it out of VITE variables, the browser and APK. This endpoint does NOT claim the complete gate passed: it reports the provider check only.

The existing private provider client is used with its network explicitly set to testnet. Results deliberately omit account IDs, pool credentials, order IDs, raw upstream errors, balances and share counts. A public market response never authenticates an account. A selected order must be present exactly once on the returned page; pagination is not assumed or silently invented. Reported order/statistics access does not establish actual delivered capacity or independent pool shares.

Counter verification inputs on an authorized host:

- NEO_COUNTER_SANDBOX_ORDER_FILE: absolute path to trusted server invoice JSON.
- NEO_COUNTER_SANDBOX_RECEIPT_FILE: absolute path to the exact signed UTF-8 candidate body.
- NEO_COUNTER_SANDBOX_SIGNATURE_FILE: absolute path containing sha256=<64 lowercase hex characters>.
- NEO_COUNTER_SANDBOX_RECEIPT_SECRET: separate, at least 32-byte secret held by approved Counter emitter and verifier.
- NEO_CLOUD_SANDBOX_LEDGER_PATH: absolute path on a durable sandbox volume.

All three input files must be regular files, not symlinks, at most 16 KiB, with mode 0600 (or stricter). Do not commit actual invoices, receipts, transaction identifiers or secrets to GitHub.

## Candidate contract (new integration contract, not an existing live Counter capability)

The trusted server invoice contains these fields:

```
environment: sandbox
network: testnet3
currency: BTC_TESTNET
service: neo-miner
provider: NICEHASH_TESTNET
providerOrderId: existing NiceHash test order UUID
orderId, merchantId, customerId: private stable identifiers
amountSats: positive integer (not a BTC decimal or USD cents)
minConfirmations: integer 1..144
scriptPubKey: expected receiving script in lowercase hex
createdAt, expiresAt: ISO UTC timestamps with milliseconds
```

The invoice must expire within 24 hours of creation and must not be expired at verification. Never construct this trusted invoice from local app drafts or checkout return parameters. The selected provider order must match NICEHASH_TEST_ORDER_ID. A provider's generic "testnet" environment and Bitcoin testnet3 payment evidence are separately labelled; compatibility with its deposit network is not assumed.

The candidate JSON carries schema `neo.counter.sandbox-payment.v1`, issuer `NEO_COUNTER`, receiptId, environment, network, currency, service, orderId, merchantId, customerId, amountSats, orderDigest, txid, vout and issuedAt. `orderDigest` is the SHA-256 produced by sandboxOrderDigest over the normalized invoice. The HMAC-SHA256 authenticates the UTF-8 domain `neo-counter.sandbox.receipt.v1` followed by one NUL byte and the exact raw JSON bytes. The signature header/file is `sha256=` plus the hex digest. Candidate issuance must be within five minutes; provider credentials are never used as the receipt-signing key.

Only the approved Counter service may issue candidates from its trusted records. Its emitter must be wired and independently reviewed before real integration can pass. The candidate is NOT settlement proof by itself: the verifier independently reads the chain observer and checks the exact transaction output, required confirmations and current block membership. It rejects coinbase transactions, wrong destinations, under/overpayments, malformed data, network substitution, stale candidates and duplicate output attribution.

The ledger rechecks the observer even on an exact retry. A receipt, output or order cannot be reassigned. It logs evidence only: it does not credit a balance, activate a contract, reserve hashrate or issue a token. An observer is a third-party trust dependency, not an independently validated full node or SPV proof. A later reorganization remains possible; do not reuse this sandbox result as irreversible production settlement authority.

## Run and verify

```
node --test server/miner-generator/cloudRetail.test.mjs server/miner-generator/cloudSandbox*.test.mjs
node server/miner-generator/cloudSandboxGate.mjs
node server/miner-generator/cloudSandboxGate.mjs --probe-public
```

The diagnostic prints a sanitized JSON report. Exit 0 means the sandbox integration checks passed; exit 2 means BLOCKED. No credentials are requested interactively and no fixtures are injected into the live diagnostic. Public endpoint unavailability from a restricted runner is not proof that the provider is down.

The GitHub workflow `neo-cloud-sandbox.yml` runs offline fixtures and a public-only observation on pull requests. That workflow intentionally demonstrates a BLOCKED real gate with no private credentials. Its separate manually dispatched provider check is restricted to main and the `neo-cloud-sandbox` environment. Missing secrets make that job fail rather than silently skip authentication. Provision environment protections and least-privilege read credentials before using it. This workflow does not claim Counter payment verification; persistent evidence verification runs on the authorized host.

## Acceptance, remaining blockers and next action

Implementation checks: signature tampering, tenant/order mismatch, mainnet/testnet4 substitution, fractional amounts, stale data, insufficient confirmations, observer failures, reorganizations, duplicate output use across restarts, private diagnostic authorization, and preservation of all production locks.

Real acceptance evidence still required:

1. Approved sandbox account with a selected SHA256 order read through authenticated API calls.
2. Counter-issued genuine candidate bound to that same order and a separately authorized test invoice.
3. Independent matching testnet3 output, confirmation and replay-protection report.
4. Private runtime smoke test with secrets kept server-side.

Do not rename the next milestone to CLOUD-003 until these external proofs exist. The immediate action is authorized sandbox credential provisioning and Counter candidate-emitter binding, not purchasing hashpower or launching retail sales.

## Rollback

Leave NEO_CLOUD_SANDBOX_ENABLED unset and remove the dedicated diagnostic read token to disable access. No frontend, APK, production ledger or payment state is changed. Reverting this additive candidate removes only the private diagnostic and sandbox verification code. Retain evidence according to the operator's retention policy; do not delete real records as an automatic rollback step.

## Primary technical sources (checked 2026-10-23)

- NiceHash official REST client and test environment: https://github.com/nicehash/rest-clients-demo
- NiceHash API docs: https://www.nicehash.com/docs/
- Blockstream Esplora API transaction/status/block-height contracts: https://github.com/Blockstream/esplora/blob/master/API.md
- Existing NEO Counter contract: docs/NEO_COUNTER_CHECKOUT_GATEWAY.md
