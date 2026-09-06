# NEO VPN Discord Live Acceptance

This gate proves that the Discord control plane is installed in the intended guild and has completed its runtime attestation. It does **not** enable the VPN data plane by itself.

## Acceptance

On the Linux runtime, after the bot service is started with its secret-store configuration:

```bash
cd services/neo-vpn/discord
npm run acceptance
```

A passing registration gate requires all of the following runtime state:

- Discord Gateway status is `online`.
- Gateway connection is established.
- The configured guild has been attested.
- Guild slash commands have been registered.
- The runtime guild ID matches `DISCORD_GUILD_ID`.

The probe exits non-zero if any condition is missing or mismatched.

## Two-stage boundary

`registrationReady=true` means the Discord application/guild/role/command binding is accepted.

`executionReady=true` additionally requires `NEO_VPN_INFRASTRUCTURE_LIVE=true`. Keep that flag false until the real WireGuard execution backend has independently passed its own acceptance gate.

## Discord acceptance check

After the probe passes, run `/vpn-status` in an approved Discord channel with an approved role. Confirm that the response reports:

- Gateway online
- Guild attestation verified
- Guild commands registered
- Guild lock verified
- VPN data plane not enabled, until infrastructure acceptance is complete

Do not paste the Discord bot token, WireGuard private keys, wallet keys, API credentials, or recovery material into Discord or repository files.
