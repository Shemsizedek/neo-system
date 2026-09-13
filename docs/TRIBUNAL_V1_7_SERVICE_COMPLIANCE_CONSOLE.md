# Tribunal v1.7 — Service Compliance Console

Tribunal v1.7 turns the v1.5/v1.6 service ledger and escalation primitives into an operator-facing compliance console.

## Scope

- Case-level service compliance dashboard for served, pending, overdue and failed recipients.
- Chronological service timeline sourced from the hash-chained service ledger and proof records.
- Deadline/escalation display for due-soon, overdue and attempt-limit conditions.
- NEOsync compliance recommendations for authorized human review.
- Manual receipt synchronization that maps acknowledged `DELIVERED` communication-outbox records to matching service recipients.
- Idempotent synchronization: the same communication is not appended to the service ledger twice for the same recipient.
- Proof-packet JSON export with SHA-256 payload fingerprint.
- Tribunal dashboard integration.

## New backend routes

- `POST /v1/workspaces/:workspaceId/service/sync-receipts`
- `POST /v1/workspaces/:workspaceId/service/compliance/:claimNo/recommendations`

Existing v1.6 timeline, escalation and proof-packet routes remain the primary read models used by the console.

## Receipt synchronization

Synchronization requires a `CLERK` role. A communication qualifies only when:

1. it belongs to the same workspace;
2. its `notice_id` matches the service recipient;
3. its channel matches the service recipient channel;
4. its destination matches the service recipient destination; and
5. its communication status is `DELIVERED`.

A qualifying record is passed through the normal `recordServiceAttempt` path so evidence hashing, recipient state changes and service-ledger chaining remain centralized.

## NEOsync recommendations

Recommendations are derived from recorded service compliance and escalation state. They are decision-support outputs such as `REVIEW_OVERDUE_SERVICE`, `REVIEW_FAILED_SERVICE`, `CONTINUE_SERVICE_MONITORING`, `REVIEW_ALTERNATE_SERVICE`, and `REVIEW_PROOF_PACKET`.

They do not autonomously decide legal sufficiency, approve alternate service, close a case, or create external legal effect.

## Security and institutional boundary

The console uses the existing authenticated Tribunal session and workspace RBAC model. Service state remains an internal institutional record. External service-of-process requirements, statutory deadlines, jurisdictional sufficiency, and evidentiary admissibility depend on the governing law and recognized procedures applicable to the actual matter.
