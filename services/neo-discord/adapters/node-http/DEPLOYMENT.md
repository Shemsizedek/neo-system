# NEO Discord Node standby deployment

The Node HTTP adapter is the provider-neutral standby transport for Discord interactions and now also hosts the governed NEO Bots approval control surface.

## Runtime contract

Run the repository-root Dockerfile at `services/neo-discord/adapters/node-http/Dockerfile` on any HTTPS-capable container host. The host must terminate TLS and forward requests to `PORT` (default `8788`).

Required runtime secrets/configuration remain outside GitHub source:
- `DISCORD_PUBLIC_KEY`
- `DISCORD_APPLICATION_ID`
- `DISCORD_BOT_TOKEN`
- existing Discord allowlist variables used by the shared core
- `NEO_BOTS_CONTROL_TOKEN`
- `NEO_BOTS_OPERATOR_IDS` or `DISCORD_OPERATOR_USER_IDS`
- `NEO_BOTS_CONTROL_URL` on the Discord command runtime, normally the same public host plus `/neo-bots/control`
- CES credentials only in the deployment secret store using `NEO_CES_<EXCHANGE>_USERNAME` and `NEO_CES_<EXCHANGE>_PASSWORD`
- optional CES login/form metadata variables supported by `server/neo-bots/deployment-secrets.mjs`
- optional upstream/API credentials already supported by the shared core

Do not commit any secret value to GitHub. The control token and CES passwords must be injected by the deployment platform at runtime.

## NEO Bots endpoints

- `GET /neo-bots/health` reports configuration presence only. It never returns secret values and currently reports `liveCesExecutionEnabled: false`.
- `GET /neo-bots/control/approvals` lists pending governed approvals for an allowlisted operator when called with `Authorization: Bearer <NEO_BOTS_CONTROL_TOKEN>` and `x-neo-actor`.
- `POST /neo-bots/control/approvals/:approvalId` resolves an approval decision. Approval does not execute the underlying CES operation.

The deployment runtime intentionally attaches the safe CES stub adapter. Live CES value movement remains disabled until a later gate explicitly wires reviewed routes/forms, validated sessions, exact fingerprints, secret injection, and execution policy.

## Activation gate

Do not mark `node-http` deployed in `runtime-policy.json` until all are true:
1. a stable public HTTPS base URL exists;
2. `GET /health` returns `ok: true` and `service: neo-discord`;
3. `GET /neo-bots/health` returns `ok: true`, `controlTokenConfigured: true`, and `operatorAllowlistConfigured: true`;
4. signed Discord ping smoke test succeeds;
5. signed `/neo`, `/relations`, and `/bots action:pending` smoke tests succeed for an authorized test actor;
6. an unauthorized actor is rejected by both the Discord operator policy and NEO Bots control endpoint;
7. NEO Discord Neutral Transport and NEO Bots CI are green on the deployed commit;
8. no secrets are present in GitHub Pages or repository files.

Deployment alone does not make Node primary. Promotion remains a separate human-dispatched policy decision.
