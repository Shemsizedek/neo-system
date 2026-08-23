# NEO Tribunal v1.1 — Administration, Recovery & Delivery Controls

## Scope

v1.1 hardens the operational release with identity recovery, member administration, delivery-adapter records, schema v2 migration metadata, operational reporting, and backup verification.

## Identity lifecycle

- Authenticated users may change their own password after proving the current password.
- Password changes revoke all active sessions for that identity.
- A `GRAND_SHEIK` workspace administrator may issue a short-lived, one-time reset token for an existing workspace member.
- Reset tokens are stored only as SHA-256 hashes, expire automatically, and are marked used after consumption.
- Reset completion revokes all existing sessions.

Reset tokens are administrative credentials and should be delivered through a trusted private channel. The application does not claim that an internal reset workflow substitutes for a third-party identity provider.

## Delivery adapters

The delivery registry supports three adapter labels:

- `INTERNAL_RECORD`
- `CERTIFIED_EMAIL_ADAPTER`
- `WEBHOOK_ADAPTER`

v1.1 records delivery attempts, destinations, status, provider references, and errors. It does **not** itself transmit certified email or invoke a webhook provider. A production provider integration should update the delivery record only after the provider returns a verifiable result.

## Member administration

The server remains the source of truth for role enforcement. The UI exposes member role controls, but only a server-authorized `GRAND_SHEIK` can change roles.

## Operational report

Review-capable users can retrieve a workspace report containing counts for members, cases, E-Files, notices, hearings, delivery attempts, audit entries, active sessions, and current audit-chain verification status.

## Schema v2

Schema v2 adds `password_resets` and `delivery_attempts`. `schema_meta` preserves applied schema versions and timestamps. Startup remains idempotent for existing v1 databases.

## Backup verification

`npm run tribunal:backup` now performs a WAL checkpoint before copying the SQLite database and runs `PRAGMA integrity_check` against the resulting backup. A failed integrity check aborts the backup operation.

## Security boundary

NEO Tribunal is an internal records, collaboration, analysis, and adjudicative-workflow platform. Its software roles, notices, hearings, delivery records, or Tribunal dispositions do not themselves create external governmental, judicial, police, military, banking, diplomatic, or compulsory legal authority.
