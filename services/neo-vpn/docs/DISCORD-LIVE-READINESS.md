# NEO VPN Discord Live Readiness

The Discord control plane must not be called live until all activation prerequisites are satisfied and Discord has successfully validated the HTTPS interactions endpoint.

## Required runtime values

- `DISCORD_APPLICATION_ID`
- `DISCORD_PUBLIC_KEY`
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `NEO_VPN_DISCORD_VIEWER_ROLE_IDS`
- `NEO_VPN_DISCORD_OPERATOR_ROLE_IDS`
- `NEO_VPN_DISCORD_ADMIN_ROLE_IDS`
- `NEO_VPN_DISCORD_INTERACTIONS_ENDPOINT`

The endpoint must be HTTPS and end with `/api/neo-vpn-discord`.

## Two-stage readiness

`readyForRegistration` means Discord commands may be registered safely.

`readyForControlExecution` additionally requires `NEO_VPN_INFRASTRUCTURE_LIVE=true`. Keep that flag false until the real execution backend is available and separately accepted.

## Acceptance sequence

1. Configure the runtime/environment values in secret stores.
2. Run `node services/neo-vpn/discord/live-readiness.mjs`.
3. Run the guild-scoped Discord command registration workflow.
4. Configure the deployed HTTPS route as the Discord Interactions Endpoint URL.
5. Allow Discord to perform its signed endpoint verification/PING.
6. Run `/vpn-status` in the approved guild/channel using an approved role.
7. Verify the returned request is read-only and does not expose secrets.
8. Keep mutating commands approval-gated.
9. Only after a real gateway/execution adapter passes acceptance may `NEO_VPN_INFRASTRUCTURE_LIVE` be set to `true`.

## Current hosting note

The repository contains the Vercel-compatible API route, but repository readiness is not proof that a live Vercel project or deployment exists. Hosting/account binding must be verified separately.
