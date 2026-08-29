# NEO Discord Node standby deployment

The Node HTTP adapter is the provider-neutral standby transport for Discord interactions.

## Runtime contract

Run the repository-root Dockerfile at `services/neo-discord/adapters/node-http/Dockerfile` on any HTTPS-capable container host. The host must terminate TLS and forward requests to `PORT` (default `8788`).

Required runtime secrets/configuration remain outside GitHub source:
- `DISCORD_PUBLIC_KEY`
- `DISCORD_APPLICATION_ID`
- `DISCORD_BOT_TOKEN`
- existing allowlist variables used by the shared Discord core
- optional upstream/API credentials already supported by the shared core

## Activation gate

Do not mark `node-http` deployed in `runtime-policy.json` until all are true:
1. a stable public HTTPS base URL exists;
2. `GET /health` returns `ok: true` and `service: neo-discord`;
3. signed Discord ping smoke test succeeds;
4. signed `/neo` and `/relations` smoke tests succeed for an authorized test actor;
5. NEO Discord Neutral Transport parity CI is green on the deployed commit;
6. no secrets are present in GitHub Pages or repository files.

Deployment alone does not make Node primary. Promotion remains a separate human-dispatched policy decision.
