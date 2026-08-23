# NEO Tribunal v1.2 — Communications and Calendar Layer

This milestone adds an auditable communications queue and hearing calendar export layer to the Tribunal backend.

## Delivered

- Schema v3 communications tables.
- Reusable notice/message templates with `{{variable}}` rendering.
- Encrypted provider configuration vault for SMTP, certified-email, and webhook adapter metadata.
- Provider secrets are not returned by API; administrative listings expose only a short configuration fingerprint.
- Communication outbox with `READY`, `QUEUED`, `AWAITING_PROVIDER`, `RETRY`, `DELIVERED`, and `DEAD_LETTER` lifecycle states.
- Exponential retry scheduling and explicit dead-letter requeue.
- Delivery receipts and provider-reference recording.
- Internal `RECORD` adapter that can complete without an external provider.
- Hearing `.ics` generation with SHA-256 payload fingerprint and audit entry.
- Communications operational report for templates, enabled providers, queue depth, deliveries, dead letters, and calendar exports.
- Typed browser API methods for all v1.2 endpoints.

## Provider boundary

The code now contains the queue, credential-vault, adapter-facing state machine, and receipt model needed for external delivery providers. It does **not** silently transmit email or webhooks. External provider execution must be explicitly configured and implemented with the selected provider contract, and a communication is not marked `DELIVERED` without a receipt outcome or the internal record adapter.

## Calendar boundary

The hearing endpoint generates an interoperable iCalendar document. It does not automatically place events on Google, Microsoft, Apple, or other third-party calendars. Those systems can consume the generated `.ics` artifact or be connected through a later provider adapter.

## API additions

- `POST/GET /v1/workspaces/:workspaceId/communications/templates`
- `POST/GET /v1/workspaces/:workspaceId/communications/providers`
- `POST/GET /v1/workspaces/:workspaceId/communications/outbox`
- `POST /v1/workspaces/:workspaceId/communications/outbox/:id/process`
- `POST /v1/workspaces/:workspaceId/communications/outbox/:id/retry`
- `GET /v1/workspaces/:workspaceId/communications/report`
- `GET /v1/workspaces/:workspaceId/hearings/:hearingId/calendar.ics`

All writes continue to use Tribunal RBAC and append audit events to the existing hash-linked audit chain.
