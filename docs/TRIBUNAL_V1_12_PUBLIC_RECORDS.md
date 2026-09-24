# Tribunal v1.12 — NEO-PACER Public Records Publication

Tribunal v1.12 connects the production World Court at `court.holytemples.org` to **NEO-PACER — Public Access to Noocratic Ecclesiastical Records**.

## Public-record publication model

Public access is opt-in. Tribunal records are not automatically exposed. A JUDGE-role user must publish a deliberately sanitized public record containing:

- claim number;
- record type;
- optional source identifier and source hash;
- public title and summary;
- an explicit public payload containing only fields approved for disclosure.

The publication receives its own SHA-256 fingerprint. Withdrawal does not delete the administrative publication ledger; it removes the record from public search and records an audited withdrawal event.

## Public endpoints

- `GET /v1/public/records`
- `GET /v1/public/records/:recordId`
- `https://court.holytemples.org/records`
- `https://court.holytemples.org/neo-pacer/`

Public search supports `q`, `claimNo`, `recordType`, and bounded `limit` parameters.

## Authenticated publication endpoints

- `POST /v1/workspaces/:workspaceId/public-records` — JUDGE
- `GET /v1/workspaces/:workspaceId/public-records` — REVIEWER
- `POST /v1/workspaces/:workspaceId/public-records/:recordId/withdraw` — JUDGE

## Privacy and authority boundary

The public endpoint never decrypts or automatically republishes private case envelopes, E-File submissions, intake payloads, evidence stores, provider secrets, or membership data. Publication is a separate affirmative act.

NEO-PACER is the World Interfaith Court institutional public-record system. It is not the U.S. federal Judiciary PACER service and publication does not itself establish governmental status, external jurisdiction, or legal effect.
