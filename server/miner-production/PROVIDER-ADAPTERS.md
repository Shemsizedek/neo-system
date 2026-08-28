# NEO Miner Live Provider Adapter Pack

This layer connects the production readiness gate to real external services while keeping credentials out of source control.

## Live providers

- Bitcoin Core JSON-RPC via `BITCOIN_RPC_URL` + `BITCOIN_RPC_AUTH`
- Counterparty API v2 health via `COUNTERPARTY_API_URL`
- Stratum mining pool via `MINING_POOL_ENDPOINT`
- FX source via `FX_API_URL`
- Payment provider health via `PAYMENT_PROVIDER_HEALTH_URL`
- HMAC-SHA256 payment webhook verification using `PAYMENT_PROVIDER_SECRET`

All adapters fail closed when required configuration or connectivity is missing.

## Cloud-mining contract lifecycle

`PAYMENT_PENDING -> PAID -> CAPACITY_RESERVED -> ACTIVE -> SETTLEMENT_PENDING -> SETTLED`

Live activation requires:

1. confirmed payment;
2. sufficient backed physical hashrate;
3. production readiness passing;
4. verified customer settlement destination;
5. at least one miner allocation;
6. `simulation=false`.

Settlement requires verified BTC attribution and a settlement reference. Demo/simulation contracts cannot activate on the live path.

## Production API

Authenticated endpoints:

- `GET /providers`
- `GET /probe`
- `GET /snapshot`
- `POST /contracts`
- `POST /contracts/:id/payment`
- `POST /contracts/:id/reserve`
- `POST /contracts/:id/activate`
- `POST /contracts/:id/settlement-pending`
- `POST /contracts/:id/settle`

Public endpoints:

- `GET /health`
- `GET /ready`

Run with `npm run miner:production`. Tests run under both `npm test` and `npm run miner:production:test`.
