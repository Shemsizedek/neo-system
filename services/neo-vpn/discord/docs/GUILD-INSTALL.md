# NEO VPN Discord Guild Installation

This mode uses Discord Gateway only. It does not require Vercel, a webhook URL, or a public HTTPS interaction endpoint.

## 1. Generate the install URL

On the runtime host, after `DISCORD_APPLICATION_ID` is configured:

```bash
cd services/neo-vpn/discord
node generate-install-url.mjs
```

Open the printed Discord authorization URL while signed into an account that can add apps to the intended server. The generated URL requests only the `bot` and `applications.commands` scopes and requests no broad bot permissions (`permissions=0`).

## 2. Add the app to the intended guild

Select the server whose ID exactly matches `DISCORD_GUILD_ID`. Discord requires the server owner or a member with Manage Server permission to add an app to a server.

## 3. Restrict command access in Discord

The bot also enforces Viewer/Operator/Admin role IDs internally. For defense in depth, use Discord Server Settings → Integrations → the NEO VPN app to restrict commands by role and channel. Do not rely on role names; use the configured role IDs in the runtime environment.

## 4. Start and verify

Start or restart the persistent service:

```bash
sudo systemctl restart neo-vpn-discord
sudo systemctl status neo-vpn-discord --no-pager
```

Then run `/vpn-status` in the configured guild. Expected control-plane state is `online` once the Gateway session and guild command registration are healthy. VPN data-plane state remains disabled until a real WireGuard execution adapter is intentionally enabled.

## Security boundary

Never paste the bot token into Discord messages, Git commits, issue comments, logs, or screenshots. Store it only in the protected runtime secret file created by the first-boot flow. The install URL contains only the public application ID and OAuth scopes; it contains no bot token or private credential.
