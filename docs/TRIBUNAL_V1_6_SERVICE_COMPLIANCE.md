# Tribunal v1.6 — Service Compliance & Escalation

## Scope

v1.6 adds a service-compliance layer on top of the v1.5 hash-chained service ledger.

### Added capabilities

- Case-level service history timeline assembled from recipients, service-ledger attempts, and proof records.
- Deadline evaluation with `DUE_SOON` and `OVERDUE` alerts.
- Attempt-threshold escalation with `ATTEMPT_LIMIT` alerts.
- Alternate-service plan proposals with explicit legal-effect boundary.
- Proof-packet assembly containing recipients, proofs, timeline, and SHA-256 payload fingerprint.
- API routes for timeline, escalation review, proof packets, and alternate-service planning.
- Automated tests covering served-history packets and overdue alternate-service review.

## API

- `GET /v1/workspaces/:workspaceId/service/compliance/:claimNo/timeline`
- `POST /v1/workspaces/:workspaceId/service/compliance/:claimNo/escalations`
- `GET /v1/workspaces/:workspaceId/service/compliance/:claimNo/proof-packet`
- `POST /v1/workspaces/:workspaceId/service/alternate-plan`

## Escalation semantics

Escalation results are workflow recommendations only. The engine does not decide that an alternate method is legally sufficient. Any alternate service must be reviewed under the Tribunal's adopted rules and, when external legal effect is sought, the applicable law of the relevant jurisdiction.

## Integrity

Proof packets carry a SHA-256 fingerprint over the generated packet body. Existing v1.5 service-ledger hashes remain the record-integrity basis for service-attempt history.

## NEO integration

The milestone feeds service-compliance state into NEOsync orchestration, NEO Law procedural analysis, NEO Algo decision-support inputs, NEO Oracle verification, NEO Router routing, and GISS/NEO LMS instructional material. Canonical integration context is maintained in `docs/NEO_INNER_BAR_TRIBUNAL_CANONICAL_CONTEXT.md`.
