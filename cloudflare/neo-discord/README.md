# NEO Discord Gateway

Bidirectional Discord interaction surface for NEOsync.

## Runtime

Cloudflare Worker: `neo-discord`

Interaction endpoint after deployment:

`https://neo-discord.<your-workers-subdomain>.workers.dev/discord/interactions`

## Worker secrets / variables

Required:
- `DISCORD_PUBLIC_KEY` — Discord application public key (64 hex characters).
- Either `NEOSYNC_CHAT_URL` (+ optional `NEOSYNC_CHAT_TOKEN`) or `OPENAI_API_KEY`.

Optional:
- `OPENAI_MODEL` — defaults to `gpt-5-mini`.
- `DISCORD_ALLOWED_USER_IDS` — comma-separated Discord user IDs.
- `DISCORD_ALLOWED_GUILD_IDS` — comma-separated Discord server IDs.

Never commit these values to the repository.

## GitHub Actions secrets

Deployment:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Slash-command registration:
- `DISCORD_APPLICATION_ID`
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID` (recommended while testing; omit for global registration)

GitHub event notifications:
- `DISCORD_WEBHOOK_URL`

## Bring-up order

1. Merge the bridge PR.
2. Configure Cloudflare/Worker secrets.
3. Run **Deploy NEO Discord Gateway**.
4. Copy the deployed Worker URL and set Discord Developer Portal → Interactions Endpoint URL to `/discord/interactions`.
5. Run **Register NEO Discord Command**.
6. In Discord, run `/neo prompt:hello`.

The Worker verifies Discord Ed25519 signatures before accepting an interaction, defers the Discord response, calls NEOsync/OpenAI, and edits the original interaction response. The slash command is ephemeral by default.
