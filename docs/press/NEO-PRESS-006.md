# NEO-PRESS-006 — Independent corrections and runtime security review

Date: 2026-11-02. State: **DRAFT / NOT MERGED / NOT DEPLOYED**.

Stacked on #1304 (001), #1305 (002), #1306 (003), #1307 (004), #1308 (005).

## Implemented

### Independent correction decisions

- Gate 005 opened restricted editor/privacy correction records and append-only custody events.
- Gate 006 adds two separate correction approvals: \`EDITOR\` and \`PRIVACY\`, submitted by different authorized press identities. Neither may be the initiating editor or original reporter.
- Resolution remains \`OPEN\` unless **both** independent decisions are \`APPROVE\`. A rejection does not erase the original complaint or open an override channel.
- Resolution decisions record the identity, gate, decision, timestamp, SHA-256 of reviewer rationale and custody event; they never overwrite original evidence or existing review history.
- A resolved correction **does not restore publishing eligibility**. It requires a new \`ACCURACY\`, \`PRIVACY\`, and \`LEGAL_RISK\` review round with three different reviewer identities; any rejection blocks eligibility. The re-review round is keyed to the complete correction-state snapshot; another correction changes the snapshot and invalidates earlier round approvals.
- The existing publication candidate is **never a publication action**. Actual release, publication to WordPress/social media, court filings and public press issuances remain unavailable.

### Case API and private dashboard

- \`POST /api/v1/press/corrections/:uuid/decision\`, with a signed NEOpass press token, active role, and case authorization.
- \`POST /api/v1/press/evidence/:uuid/post-correction-review\`, requiring signed role-scoped case membership.
- Both routes are disabled in the unconfigured runtime; they never trust header role claims.
- Private newsroom portal adds a responsive Resolution view for the distinct editor/privacy decisions and post-correction checks. The browser requests short-lived tokens through the approved Noogle NEOpass memory-only bridge, and stores no source material or tokens.
- The private catalog retains a correction hold until both correction resolution **and fresh full editorial approvals** are complete.

### Production readiness evidence

- \`server/neo-press/runtime-preflight.mjs\` combines the existing 11-control signed readiness manifest with six extra operator-review dimensions: live Noogle issuer/revocation, isolated encrypted media & DB storage, legacy Evidence Vault containment, independent custody witness, source privacy, and jurisdiction-specific legal clearance.
- A complete evidence packet may reach only \`INDEPENDENT_APPROVAL_REQUIRED\`; it can **never** assert deployment, production identity certification, or press credential authenticity on its own. Missing evidence returns \`BLOCKED\`.
- No live storage, KMS, identity provider, public web host or external custody witness was contacted or configured. Tests run only with test membership and data.

## Security and production blockers

1. PR dependency chain reviewed, reconciled and merged only after full CI passes; global GISS/architecture checks may remain separate blockers.
2. Legacy Evidence Vault HTTP access flaw isolated or remediated. Do not mount press-only protected database or media files into the legacy public service.
3. Real independent Noogle/NEopass token issuer, revocation and role registry verified; no Google login dependence should be introduced to this press flow.
4. Production encryption at rest for SQLite and original media, KMS custody/rotation, backups, and documented restoration verified by an independent security reviewer.
5. Rate limits, CSRF/CORS, identity revocation, concurrent editorial actions, PII minimization and encrypted correction-note storage tested.
6. Independent custody checkpoints published to a separately controlled witness, independently retrieved, and tied to source proof.
7. Counsel reviews state/federal reporter recording, access, source protection, and privacy laws for actual operating jurisdictions.
8. Explicit separate release approval; no tokens, accounts, credentials, sources or alleged findings automatically published.

## Test command

\`node --test server/neo-press/*.test.mjs\`. Gate 006 tests verify distinct reviewers, correction rejection handling, fresh approvals, privacy/case-role denial and release blocking, and missing runtime evidence.

## Next gate: NEO-PRESS-007

Production-bound hardening: authoritative role-registry integration, actual protected staging deployment only after explicit approval, independent witness/backup verification, and stress testing concurrency, replay and audit integrity. Any real public portal or credential issuance is a separate controlled release.
