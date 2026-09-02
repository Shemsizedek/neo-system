# NEO Miner Cloud Run telemetry bridge

The Cloud Run service exposes one protected Discord read endpoint and can optionally read an upstream NEO Miner production snapshot.

## Runtime contract

- `NEO_MINER_OPERATOR_TOKEN`: protects Cloud Run `GET /discord/snapshot`.
- `NEO_MINER_TELEMETRY_URL`: upstream HTTPS URL whose path is exactly `/snapshot`.
- `NEO_MINER_TELEMETRY_TOKEN`: dedicated upstream read-only bearer token.

The upstream must be a deployed NEO Miner API/BFF. Do not expose Bitcoin Core RPC directly to Cloud Run and do not reuse Bitcoin RPC, wallet, payout, Discord, or Cloudflare credentials.

When upstream configuration is absent or unreachable, Cloud Run returns a fail-closed bootstrap status. It never falls back to fabricated live data.

## Allowlisted output

Only operational scalars are forwarded: Bitcoin connection/height, pool connection, verified/online miner counts, aggregate hashrate, open incident count, upstream status and timestamp. Wallets, addresses, transactions, payouts, customer records, credentials and arbitrary upstream fields are discarded.

The bridge makes GET requests only. It exposes no start, stop, approval, signing, payout or transaction route.
