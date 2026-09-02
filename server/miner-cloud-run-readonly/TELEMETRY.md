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


## Deployment gate

The GitHub environment `neo-miner-production` accepts these optional paired values:

- Variable `NEO_MINER_TELEMETRY_URL`: the production HTTPS URL ending in exactly `/snapshot`.
- Secret `NEO_MINER_TELEMETRY_TOKEN`: the dedicated upstream bearer token.

Both must be present or both absent. When absent, deployment remains `READ_ONLY_BOOTSTRAP`. When present, the workflow validates the URL, stores the token as a new version of Google Secret Manager secret `neo-miner-telemetry-token`, mounts it into Cloud Run, and verifies that the protected response reports `READ_ONLY_TELEMETRY`.

Provision the GCP secret and least-privilege access once before enabling the pair:

```bash
gcloud secrets create neo-miner-telemetry-token \
  --project="$GCP_PROJECT_ID" \
  --replication-policy=automatic

gcloud secrets add-iam-policy-binding neo-miner-telemetry-token \
  --project="$GCP_PROJECT_ID" \
  --member="serviceAccount:$GCP_CLOUD_RUN_SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretVersionAdder"

gcloud secrets add-iam-policy-binding neo-miner-telemetry-token \
  --project="$GCP_PROJECT_ID" \
  --member="serviceAccount:$GCP_CLOUD_RUN_RUNTIME_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"
```

Do not add the upstream token as a plain GitHub variable or Cloud Run environment value.
