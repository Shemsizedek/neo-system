# NEO VPN Discord-only mode

NEO VPN now supports a Discord Gateway control-plane mode that does not require Vercel, an HTTPS interactions endpoint, or any other web application host.

## What Discord-only means

Discord is the sole external control service. A small local/persistent Node.js process maintains the authenticated Discord Gateway websocket and receives slash-command interactions directly.

This does not make Discord a WireGuard VPN server. Discord carries command/control traffic only. WireGuard tunneling and any future execution adapter still require a machine capable of running the VPN data plane.

## Runtime

From `services/neo-vpn/discord`:

```bash
npm install
npm start
```

Required runtime values:

- `DISCORD_BOT_TOKEN`
- `DISCORD_APPLICATION_ID`
- `DISCORD_GUILD_ID`
- one or more configured viewer/operator/admin role IDs

The bot automatically registers the NEO VPN guild commands when its Discord Gateway session becomes ready.

## Authorization

Role IDs are mapped to Viewer, Operator, and Admin policy tiers. Discord role names are never authority. The bot is restricted to the configured guild and uses only the `Guilds` gateway intent.

Mutating operations remain policy/approval requests. The bot does not expose arbitrary shell execution and does not accept private keys, wallet secrets, seed phrases, CES credentials, cloud credentials, recovery codes, or session cookies.

## Current execution boundary

`NEO_VPN_INFRASTRUCTURE_LIVE=false` remains the safe default. In Discord-only mode this means the bot can become a live control plane while the WireGuard data plane remains unavailable. Readiness messages must distinguish those states.

Do not set infrastructure live merely because the Discord bot connected successfully.

## Acceptance

A Discord-only control-plane acceptance requires:

1. bot logs `discord-gateway-ready`;
2. bot logs `discord-commands-registered` for the configured guild;
3. an authorized user can execute `/vpn-status`;
4. an unauthorized user receives an ephemeral denial;
5. a mutating command enters the approval policy rather than executing directly;
6. no secret values appear in bot logs.
