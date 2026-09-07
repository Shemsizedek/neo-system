# NEO VPN Discord Host Activation

This is the operator gate for activating the Discord-only NEO VPN control plane on the persistent Linux host.

## Run

From the NEO System checkout on the Linux host:

```bash
sudo bash services/neo-vpn/discord/activate-host.sh
```

On first run the command securely asks for the Discord Application ID, Guild ID, Viewer/Operator/Admin role IDs, and bot token. The secret file is stored at `/etc/neo-vpn/discord.env` with mode `0600`. The token is not printed into the activation output.

The command then:

1. validates the runtime configuration;
2. prints the least-privilege Discord guild-install URL (Application ID only, never the token);
3. installs/restarts the `neo-vpn-discord.service` systemd unit;
4. waits for Discord Gateway connection, guild attestation, and command registration;
5. runs the machine acceptance probe;
6. instructs the operator to verify `/vpn-status` in Discord.

If the application has not been installed in the guild yet, use the printed installation URL and rerun the exact same activation command. The workflow is intentionally idempotent.

To replace the host configuration later, run:

```bash
sudo bash services/neo-vpn/discord/activate-host.sh --configure
```

## Safety boundary

Host activation forcibly keeps `NEO_VPN_INFRASTRUCTURE_LIVE=false`. Passing this gate proves the Discord command/control plane only. It does not authorize WireGuard peer mutation, packet routing, payouts, custody, wallet operations, or arbitrary shell execution.

Never paste the Discord bot token, WireGuard private keys, wallet credentials, seed phrases, cloud credentials, recovery codes, or CES credentials into Discord, GitHub issues, or repository files.

## Success condition

Activation is complete when the command exits `0` and reports `NEO VPN Discord control plane accepted`, followed by a successful authorized `/vpn-status` response showing Gateway online, guild attestation verified, guild commands registered, and VPN data plane not enabled.
