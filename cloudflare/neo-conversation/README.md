# NEOsync Conversational Command

Private Government conversational interface for NEOsync.

## Experience

- Chat-style executive interface.
- Browser speech recognition when supported.
- Browser speech synthesis for spoken replies after voice input.
- Executive brief, attention queue, escalation, and service-health prompts.
- Optional upstream NEOsync AI backend through `NEOSYNC_CHAT_URL`.
- Authenticated system-aware fallback assistant when the upstream AI backend is not configured.

## Security boundary

Cloudflare Access is required. `ADMIN_EMAILS` may further restrict executive access. The browser never receives backend service credentials. The chat surface is advisory/orchestration only: it does not sign wallets, move funds, execute terminals, perform enforcement, or bypass source-module authorization.

## Configuration

Required:

- `ACCESS_TEAM_DOMAIN`
- `ACCESS_AUD`

Recommended:

- `ADMIN_EMAILS`
- `EXECUTIVE_INBOX_URL`
- `GOVERNMENT_API_URL`
- `MODULE_ADAPTER_TOKEN`

For richer AI responses:

- `NEOSYNC_CHAT_URL`
- `NEOSYNC_CHAT_TOKEN` (if required by that backend)

If the Executive Inbox or Government API is itself protected by Cloudflare Access, configure a Cloudflare Access service token at the worker/network layer or expose a dedicated authenticated machine-to-machine route. Do not make those private APIs public merely to support chat.
