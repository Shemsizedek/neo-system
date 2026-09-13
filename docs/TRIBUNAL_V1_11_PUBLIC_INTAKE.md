# Tribunal v1.11 — World Interfaith Court Public Intake Gateway

## Purpose

v1.11 creates a public-facing intake boundary between `holytemples.org` and the authenticated NEO Tribunal workspace. Public submissions are **not** written directly into the authoritative E-File ledger. They enter an encrypted moderation queue and must be claimed and reviewed by authorized Tribunal personnel before promotion.

## Public endpoint

`POST /v1/public/intake`

Accepted request formats:

- `application/json`
- `application/x-www-form-urlencoded`

Required fields:

- `caseType`
- `petitioner`
- `petitionerEmail`
- `respondent`
- `statement`
- `consent=true`

Optional fields include petitioner/respondent location, council, respondent email, and an existing claim/reference number. A hidden `website` honeypot is rejected when populated.

The gateway enforces bounded field sizes, a 64 KiB request ceiling, email validation, a public-intake rate limit, and a bot honeypot. The payload is AES-GCM encrypted using the Tribunal master-key boundary. The database stores a SHA-256 payload fingerprint and a one-way request fingerprint rather than a raw source IP.

HTML form submissions receive a minimal receipt page. JSON clients receive a structured receipt containing an intake ID, human-readable receipt code, status, payload SHA-256, and timestamp.

A receipt confirms institutional intake only. It does not establish case acceptance, jurisdiction, service, adjudication, or external legal sufficiency.

## Moderation workflow

Authenticated Tribunal routes:

- `GET /v1/workspaces/:workspaceId/intakes`
- `POST /v1/workspaces/:workspaceId/intakes/:intakeId/claim`
- `POST /v1/workspaces/:workspaceId/intakes/:intakeId/promote`

A Clerk can view the intake queue. A Judge must claim an unassigned intake into a workspace before it can be promoted. A Clerk may then promote a reviewed intake into the existing encrypted E-File workflow. Promotion is idempotent and records the public intake receipt code and payload hash in the filing metadata.

## Schema v6

`public_intakes` stores encrypted submissions and moderation state:

- `PENDING_REVIEW`
- `UNDER_REVIEW`
- `PROMOTED`

Workspace assignment, reviewer identity, review timestamps, promoted filing ID, payload fingerprint, and timestamps are retained for auditability.

## WordPress integration

The production form target is:

`https://court.holytemples.org/v1/public/intake`

The live World Interfaith Court / World Chaplaincy form should be switched to this endpoint only after HTTPS health for `court.holytemples.org` is verified. This prevents public filings from being directed to an unavailable or unencrypted endpoint.

## Institutional boundary

This service is an electronic intake and records workflow for the World Interfaith Court. It does not, by software operation alone, create governmental court status, compulsory jurisdiction, legally sufficient service, police authority, or recognition by an external tribunal or public authority.
