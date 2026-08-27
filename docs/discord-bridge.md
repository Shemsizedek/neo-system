# NEO Discord Bridge

This bridge connects selected GitHub repository events to Discord and provides a separate bidirectional Discord interaction gateway for NEOsync/OpenAI, without storing Discord credentials in source control.

## GitHub -> Discord notifications

Required GitHub Actions secret:

`DISCORD_WEBHOOK_URL`

Its value must be the Discord channel webhook URL created for the NEO server/channel that should receive GitHub notifications.

Events currently published:

- Pushes to `main`
- Pull request opened, reopened, synchronized, ready for review, or closed
- Issue opened, reopened, or closed
- Manual test through `workflow_dispatch`

Workflow file:

`.github/workflows/neo-discord.yml`

If `DISCORD_WEBHOOK_URL` is not configured, the notification workflow exits cleanly without failing unrelated repository work.

## Discord -> NEOsync/OpenAI -> Discord

Runtime:

`cloudflare/neo-discord`

The Worker verifies Discord Ed25519 signatures, accepts the `/neo` application command, immediately defers the interaction response, calls the configured NEOsync/OpenAI service, then edits the original Discord response.

Required Worker secret:

- `DISCORD_PUBLIC_KEY`

AI configuration requires either:

- `NEOSYNC_CHAT_URL` and optional `NEOSYNC_CHAT_TOKEN`, or
- `OPENAI_API_KEY` and optional `OPENAI_MODEL`.

Optional authorization limits:

- `DISCORD_ALLOWED_USER_IDS`
- `DISCORD_ALLOWED_GUILD_IDS`

## Slash-command registration

GitHub Actions secrets:

- `DISCORD_APPLICATION_ID`
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID` (recommended for testing)

Run the **Register NEO Discord Command** workflow after the Worker is deployed and Discord's Interactions Endpoint URL has been set to the Worker `/discord/interactions` route.

## Security boundary

Do **not** commit webhook URLs, bot tokens, Discord application private material, Cloudflare credentials, or OpenAI credentials to the repository.

The Discord gateway connects to the NEOsync/OpenAI service layer. It does not expose or synchronize the private state/history of an individual ChatGPT conversation session.
