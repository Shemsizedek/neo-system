# NEO Discord + NEO Bots OCI deployment

This deployment lane runs the provider-neutral Node HTTP adapter on the repository's declared OCI Always Free backend target. It does not promote the Node adapter to primary transport and it does not enable live CES financial execution.

## GitHub deployment secrets

The manual workflow `.github/workflows/deploy-neo-discord-oci.yml` requires these GitHub Actions secrets:

- `OCI_NEO_HOST` — OCI host or public IP
- `OCI_NEO_USER` — SSH account permitted to deploy the service
- `OCI_NEO_SSH_PRIVATE_KEY` — deployment SSH private key
- `NEO_DISCORD_PUBLIC_BASE_URL` — public HTTPS base URL that reverse-proxies to the Node service

Do not store CES passwords, Discord tokens, OpenAI keys, wallet keys, or NEO Bots control tokens in repository files.

## OCI host-side secret file

Create `/opt/neo-system-secrets/neo-discord.env` on the OCI host with mode `0600`, owned by the deployment/runtime administrator. The file remains on the host and is consumed with Docker `--env-file`.

Required for Discord interaction verification and governed NEO Bots control:

- `DISCORD_PUBLIC_KEY`
- `DISCORD_APPLICATION_ID`
- `DISCORD_BOT_TOKEN`
- `DISCORD_ALLOWED_USER_IDS` and/or `DISCORD_ALLOWED_GUILD_IDS`
- `DISCORD_OPERATOR_USER_IDS` and/or `DISCORD_OPERATOR_ROLE_IDS`
- `NEO_BOTS_CONTROL_TOKEN`
- `NEO_BOTS_OPERATOR_IDS` (or rely on `DISCORD_OPERATOR_USER_IDS`)
- `NEO_BOTS_CONTROL_URL=<public-base>/neo-bots/control`

Optional AI/upstream variables may use the existing NEO Discord contract.

CES credentials are intentionally deferred. When a later governed live-session gate is approved, exchange-scoped credentials may be added to the host-side secret file as `NEO_CES_<EXCHANGE>_USERNAME` and `NEO_CES_<EXCHANGE>_PASSWORD`; their presence alone must not enable live writes.

## Host prerequisites

The OCI host must have Git and Docker installed. A TLS reverse proxy should forward the public HTTPS service to `127.0.0.1:8788`. The deployment workflow intentionally binds Docker only to loopback so the raw Node service is not directly exposed to the public network.

## Deployment behavior

The workflow is manual (`workflow_dispatch`) and performs these steps:

1. validates deployment secret presence without printing secret values;
2. connects to OCI over SSH;
3. clones or resets `/opt/neo-system` to reviewed `origin/main`;
4. verifies the host-side env file exists;
5. builds the Node 24 Docker image from repository source;
6. replaces the `neo-discord-node` container with `--restart unless-stopped`;
7. verifies public `/health` and `/neo-bots/health` endpoints.

The NEO Bots health check must report `liveCesExecutionEnabled: false` for this deployment gate.

## Activation boundary

A successful OCI deployment means the governed control surface is reachable. It does **not** automatically change `services/neo-discord/deployment/runtime-policy.json`, make Node the primary transport, authorize CES credentials, or enable transaction/V-Dollar execution. Those remain separate reviewed gates.
