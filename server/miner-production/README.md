# NEO Miner Production Gateway

This service is the production gate for NEO Cloud Mining. It does not mark the platform LIVE merely because the UI is deployed.

## Required production capabilities

All of the following must pass before `/ready` returns HTTP 200 and live cloud-mining contracts may activate:

1. Bitcoin Core or approved Bitcoin RPC connected.
2. Counterparty API v2 connected over HTTPS.
3. Stratum/Stratum V2-compatible mining pool endpoint configured.
4. At least one verified NEO Miner Agent connected to physical SHA-256 hardware.
5. Live FX provider connected for enabled fiat/world-currency quoting.
6. Authorized payment provider connected.
7. Persistent contract storage enabled.
8. Persistent settlement storage enabled.
9. Payment webhook signature verification enabled.
10. Compliance/activation policy enabled in FAIL_CLOSED mode.

## Runtime endpoints

- `GET /health` — public process health; does not imply production readiness.
- `GET /ready` — production-readiness gate. Returns 503 until every hard requirement passes.
- `GET /snapshot` — authenticated production telemetry snapshot.
- `POST /contracts/activate` — authenticated contract activation; refuses simulation, unbacked capacity, unconfirmed payment, or unverified settlement destination.

## Important deployment boundary

GitHub Pages hosts the static NEO frontend only. This service must run on an always-on Node 24-compatible backend with TLS termination, persistent storage, secret management, network access to mining infrastructure, and appropriate operational monitoring.

Never place Bitcoin RPC credentials, miner passwords, wallet private keys, Counterparty signing material, payment-provider secrets, or webhook secrets in the repository or browser bundle.

## World Currency payments

The production gateway accepts currencies only through explicitly enabled payment rails. Currency display/support does not equal payment acceptance. Every provider must define supported currencies, settlement method, webhook verification, reconciliation identifiers, refund behavior, and applicable compliance controls before being enabled.

## Cloud-mining contracts

Digital NEO Miner contracts must be capacity-backed. Activation requires confirmed payment, an executed contract, verified physical hashrate capacity, a verified customer settlement destination, production readiness, and `simulation=false`.
