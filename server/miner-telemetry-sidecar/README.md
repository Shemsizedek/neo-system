# NEO Miner telemetry sidecar

This is the only production Miner surface intended for an HTTPS telemetry tunnel.

It binds to `127.0.0.1:8891` by default, reads the full Miner API's loopback-only `GET /snapshot`, applies a second output allowlist, and exposes only:

- `GET /health`
- authenticated `GET /snapshot`

Every other route is absent. Non-GET snapshot requests return `405`. Internal failures return `503`; the sidecar never fabricates live telemetry.

## Required runtime values

- `NEO_MINER_TELEMETRY_TOKEN`: dedicated 64-character hexadecimal token shared only with the guarded Cloud Run bridge.
- `NEO_MINER_API_TOKEN`: private token used only for the local production Miner API.
- `NEO_MINER_INTERNAL_SNAPSHOT_URL`: optional; defaults to `http://127.0.0.1:8890/snapshot` and is restricted to an exact loopback `/snapshot` URL.
- `HOST`: optional; defaults to `127.0.0.1`.
- `PORT`: optional; defaults to `8891`.

Generate the public bridge token on the Linux host:

```bash
openssl rand -hex 32
```

Store it in the host secret manager and in the GitHub `neo-miner-production` environment secret `NEO_MINER_TELEMETRY_TOKEN`. Do not reuse the internal API, Bitcoin RPC, wallet, Discord, payout, or Cloudflare token.

## Network boundary

Keep both the full Miner API and this sidecar bound to loopback. Publish only the sidecar through an authenticated HTTPS reverse proxy or tunnel. The public URL must end in exactly `/snapshot`; configure that URL as GitHub environment variable `NEO_MINER_TELEMETRY_URL`.

Never publish Bitcoin Core RPC or the full `server/miner-production` API.
