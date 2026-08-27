# NEO Discord Bridge

This bridge sends selected GitHub repository events to Discord without storing Discord credentials in source control.

## Required GitHub Actions secret

Create a repository Actions secret named:

`DISCORD_WEBHOOK_URL`

Its value must be the Discord channel webhook URL created for the NEO server/channel that should receive GitHub notifications.

Do **not** commit the webhook URL, Discord bot token, Discord application private material, or OpenAI API key to the repository.

## Events currently published

- Pushes to `main`
- Pull request opened, reopened, synchronized, or closed
- Issue opened, reopened, or closed
- Manual test through `workflow_dispatch`

Workflow file:

`.github/workflows/discord-bridge.yml`

## Test

After the secret is configured, open GitHub Actions, select **NEO Discord Bridge**, and run the workflow manually. A `NEO Discord Bridge Test` message should appear in Discord.

## Architecture boundary

This workflow implements the GitHub -> Discord leg only.

A bidirectional Discord AI bot requires a separately hosted interaction gateway using Discord request-signature verification and server-side secrets. That gateway can call the OpenAI API and approved NEO services, but repository secrets must remain outside client-side code and GitHub Pages.
