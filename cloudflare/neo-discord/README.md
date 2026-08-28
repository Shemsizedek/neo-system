# NEO Discord Gateway

Bidirectional Discord interaction surface for NEOsync.

## Runtime

Cloudflare Worker: `neo-discord-api`

Interaction endpoint after deployment:

`https://neo-discord-api.neosystem.workers.dev/discord/interactions`

Health endpoint:

`https://neo-discord-api.neosystem.workers.dev/health`

This Worker is intentionally API-only and uses a distinct Cloudflare service name so static NEO frontend deployments cannot overwrite the Discord gateway.

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

1. Deploy **NEO Discord Gateway**.
2. Configure `DISCORD_PUBLIC_KEY` and the AI upstream secret on the `neo-discord-api` Worker.
3. Verify `/health` returns JSON with `ok: true` and `service: neo-discord`.
4. In Discord Developer Portal, set the Interactions Endpoint URL to `https://neo-discord-api.neosystem.workers.dev/discord/interactions`.
5. Run **Register NEO Discord Command** if command registration needs refreshing.
6. In Discord, run `/neo prompt:hello`.

The Worker verifies Discord Ed25519 signatures before accepting an interaction, defers the Discord response, calls NEOsync/OpenAI, and edits the original interaction response. The slash command is ephemeral by default.

This gateway connects Discord to the NEOsync/OpenAI service layer. It does not expose or synchronize the private state/history of an individual ChatGPT conversation session.
