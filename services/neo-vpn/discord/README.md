# NEO VPN Discord Control Center

Discord is the temporary NEO VPN control plane. It does **not** replace the WireGuard data plane or a persistent VPN gateway.

## Commands

- `/vpn-status` — read-only health and deployment status.
- `/vpn-audit` — read-only peer/configuration audit.
- `/peer-request` — submit a peer enrollment request. Never accepts a private key.
- `/peer-revoke` — request revocation of an existing peer. Requires approval before execution.
- `/incident-lockdown` — request emergency fail-closed shutdown. Requires approval before execution.
- `/deployment-status` — report GitHub/GCP activation state.

## Authorization model

Read-only commands may be granted to NEO VPN operators. Mutating commands are request/approve/execute workflows. Discord messages are not treated as sufficient authorization for treasury, wallet, CES, issuance, credential, or other financial/admin operations.

## Secret handling

Never send WireGuard private keys, seed phrases, wallet keys, API tokens, CES credentials, GitHub tokens, cloud credentials, recovery codes, or session cookies through Discord.

Peer enrollment accepts only a WireGuard **public key**, device label, requested overlay address, and operator identity. Private keys remain on the endpoint that generated them.

## Architecture

Discord user -> Discord application command -> NEO VPN control service -> authorization/policy gate -> approved adapter

Adapters may target GitHub Actions, a future Node 001 management API, or an operator queue. Until a live gateway exists, commands must return `pending-infrastructure` rather than pretending an action was executed.

## Audit

Every request should record command, Discord user ID, guild/channel ID, timestamp, correlation ID, requested target, decision, approver (when required), execution result, and resulting audit reference. Do not log secrets or VPN payload traffic.
