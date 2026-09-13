# NEOsync Executive Command Board

Private Government JARVIS-style executive surface for the NEO System.

## Capabilities
- Persistent executive conversation memory per authenticated actor.
- Browser microphone speech recognition and speech synthesis where supported.
- Executive briefs from the Executive Inbox and Government adapter fabric.
- Cross-module status retrieval.
- Persistent executive task creation, assignment, due dates and status.
- Deep-link module navigation.
- Confirmation-gated state-change proposals.
- Audit history for tasks and confirmed/rejected proposals.

## Confirmation protocol
Conversational commands that change state are not executed immediately. NEOsync creates a short-lived proposal that displays its target and impact. The executive must explicitly confirm the proposal before execution.

Initial confirmed command types:
- acknowledge top N Executive Inbox items;
- change a Government module command-console status to READY, ACTIVE, REVIEW or HOLD.

These commands do not bypass the source module's substantive permissions and do not create external legal, financial or enforcement effect by themselves.

## Required configuration
- `ACCESS_TEAM_DOMAIN`
- `ACCESS_AUD`
- `COMMAND_STORE` Durable Object binding (defined in Wrangler)

Recommended:
- `ADMIN_EMAILS`
- `EXECUTIVE_INBOX_URL`
- `GOVERNMENT_API_URL`
- `MODULE_ADAPTER_TOKEN`
- `CF_ACCESS_CLIENT_ID`
- `CF_ACCESS_CLIENT_SECRET`

Optional richer reasoning:
- `NEOSYNC_CHAT_URL`
- `NEOSYNC_CHAT_TOKEN`

The Cloudflare Access service-token values are for authenticated machine-to-machine calls to other private NEO Workers. Do not expose them to browser JavaScript.
