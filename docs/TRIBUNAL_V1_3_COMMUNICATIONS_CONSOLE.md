# NEO Tribunal v1.3 — Communications Console and Provider Worker Framework

This milestone adds an authenticated communications administration console to the Tribunal dashboard and extends the v1.2 outbox into a worker-driven provider boundary.

## Capabilities

- Tribunal Communications Console embedded in the Tribunal dashboard.
- Template creation and outbox review.
- Adapter-readiness status for RECORD, SMTP, CERTIFIED_EMAIL and WEBHOOK channels.
- Manual/scheduler-ready due-queue worker endpoint with bounded batch size.
- Explicit provider-boundary state: external channels move to `AWAITING_PROVIDER` only when an enabled provider configuration exists.
- Missing providers move through retry/dead-letter policy instead of being falsely marked delivered.
- Provider acknowledgement endpoint creates HMAC-SHA256 signed delivery receipts.
- Existing `.ics` hearing export remains available for calendar invitation workflows.
- Service health reports the communications worker as `scheduler-ready`.

## Provider boundary

The SMTP, certified-email and webhook adapters are transport interfaces in this release. They do not silently make network calls. A deployed provider implementation or worker can consume `AWAITING_PROVIDER` records, perform delivery, and then submit the explicit provider outcome to the receipt endpoint. This preserves an auditable distinction between queued, handed to a provider boundary, and confirmed delivered.

## Scheduling

`POST /v1/workspaces/:workspaceId/communications/worker/run` is suitable for an authenticated scheduler or operations job. Automated background execution is intentionally not performed under a fabricated system identity; worker actions remain attributable to an authorized Tribunal principal in the audit chain.

## Receipt integrity

Provider receipts are signed with `NEO_TRIBUNAL_RECEIPT_KEY`, falling back to `NEO_TRIBUNAL_MASTER_KEY` for development. Production deployments should use a dedicated high-entropy receipt key and rotate it under documented key-management procedures.

## Legal and operational boundary

The communications subsystem records internal Tribunal communications activity and provider outcomes. It does not itself establish certified-mail status, legal service, governmental authority, or external jurisdiction. Those effects depend on the actual provider, governing rules, and applicable law.
