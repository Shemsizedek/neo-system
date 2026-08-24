# Tribunal v1.4 — Service of Notice Automation

## Scope

v1.4 connects Tribunal notices, hearings, communications, and provider operations into one service-of-notice workflow.

## Capabilities

- Generate a hearing-linked service package from an existing Tribunal notice.
- Attach an iCalendar hearing payload and SHA-256 fingerprint to the service package.
- Queue one notice to multiple service destinations and channels in one operation.
- Preserve each queued communication in the existing auditable outbox.
- Export a communications audit bundle with outbox events, signed receipts, audit-chain head, and a bundle SHA-256 fingerprint.
- Report provider health, enabled status, queue pressure, dead-letter counts, and oldest pending work.
- Verify HMAC-SHA256 provider callback signatures at the deployment boundary.

## Provider boundary

The NEO Tribunal does not mark external service complete merely because an item was queued. SMTP, certified-email, and webhook channels continue through the provider adapter boundary and require an acknowledged provider result before delivery is recorded as complete.

Concrete provider credentials remain encrypted in `provider_configs`. Deployment-specific SMTP/certified-email/webhook transports should consume those configurations through a controlled worker implementation. No provider credential is exposed through the browser API.

## Service package integrity

A generated service package includes the notice, optional hearing, optional ICS payload, generation timestamp, and SHA-256 hash. The hash can be recorded in the case file or communications audit bundle for later integrity comparison.

## API additions

- `POST /v1/workspaces/:workspaceId/service/package`
- `POST /v1/workspaces/:workspaceId/service/queue`
- `GET /v1/workspaces/:workspaceId/communications/provider-health`
- `GET /v1/workspaces/:workspaceId/communications/audit-bundle`
- `POST /v1/workspaces/:workspaceId/provider-callback/verify`

## Security posture

Service automation is an internal records and communications workflow. It does not itself establish external jurisdiction, legal service sufficiency, arrest authority, or governmental recognition. Whether a delivery method constitutes legally sufficient service depends on the governing rules applicable to the proceeding and recipient.
