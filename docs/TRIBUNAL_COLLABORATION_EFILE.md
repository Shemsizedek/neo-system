# NEO Tribunal v0.7 — Collaboration, E-File, Service & Hearings

This milestone adds the operational collaboration layer above the v0.6 persistence/security foundation.

## Workspace and identity foundation

- Invitation objects with role assignment and expiration.
- Workspace member registry for Grand Sheik, Judge, Clerk, Marshal, Reviewer and Viewer roles.
- Append-only hash-linked audit ledger for invitation, filing, notice and hearing actions.
- Audit-chain verification from the Tribunal UI.

The current workspace registry is browser-persistent. It is an identity and collaboration foundation, not yet a production authentication provider. Production deployment should bind these roles to authenticated server identities before relying on them for access control.

## World Chaplaincy E-File

The intake schema preserves the supplied form fields:

- Case Type
- Respondent Location
- Petitioner
- Petitioner Temple Council
- Respondent
- Respondent Temple Council
- Petitioner Location
- Claim No.
- Respondent Email
- Petitioner Email
- Statement

The engine validates required fields and email format, timestamps a filed record, and can map a filed intake into a Tribunal docket.

## Notice and service workflow

Notices support draft, issued, sent, delivered, failed and acknowledged states. The workflow records method, recipient, timestamps and proof notes. These records document internal workflow activity; they do not by themselves constitute legally sufficient service under an external jurisdiction.

## Hearing management

Hearings support proposed, scheduled, held, continued and cancelled states with participants, duration, location and conflict detection.

## Audit boundary

The shared activity ledger is hash linked and tamper-evident within the browser profile. It is not yet a replicated or independently timestamped public ledger.

## Next production step

The next infrastructure milestone should replace browser-only workspace state with authenticated server identities, database-backed workspace membership, encrypted server-side case envelopes, durable append-only audit storage, invitation acceptance tokens and server-enforced authorization.
