# KI-014 — Permissioned KNOWINDEX contributions (controlled read/write)

**Stage:** Implementation on a review branch; **not a live write-service deployment**. This gate implements an opt-in contribution queue only. The public Noogle index stays read-only and is populated only by separately reviewed source evidence.

## Verified baseline

- KI-012: approved, SHA-256-pinned World Library landing page deployed to public Noogle.
- KI-013: independent public HTTP smoke verified the public Noogle JSON index and landing page.
- Existing Noogle source submissions use browser-generated GitHub issues for human review. They do not automatically index user material.
- KI-014 does not fetch Google Drive/YouTube content, enable unreviewed external crawls, operate wallets, or touch NEO Crown Chain.

## New code

- server/neo-knowindex/ledger.mjs: SQLite-backed contribution records, versioned state transitions, rate limits, idempotency, reviewer separation, and hash-chained audit events.
- server/neo-knowindex/http.mjs: opt-in authenticated API using *signature-verified* NEOpass session JWTs and *registry-resolved* active memberships/roles. Browser/oracle/crown scoped tokens are rejected. No cookie-only writes; no wildcard CORS.
- server/neo-platform-api/server.mjs: mounts the API as an optional, **disabled by default** route. Explicit configured service, authenticating member registry, JWT secret and write-authorization setting are all required; otherwise requests return HTTP 503.
- server/neo-knowindex/*.test.mjs: admission, moderation, anti-CSRF, withdrawal, rate-limit and audit-integrity tests added to main CI.

## Request contract

**POST /api/v1/noogle/knowledge/contributions** (verified active member):
JSON with title, url (HTTPS public reference), description, attribution, sourceClass, optional community, rightsBasis, rightsStatement, and **consentToIndex: true**. Requires an Authorization Bearer NEOpass session JWT; Idempotency-Key recommended. All new records start in submitted with indexPublished false.

**GET /api/v1/noogle/knowledge/contributions/{uuid}:**
Only submitter or active reviewer; unrelated identities receive 404.

**POST /api/v1/noogle/knowledge/contributions/{uuid}/review:**
Active curator/executive-admin only, distinct from submitter; JSON with action (validate, attribute, approve, dispute, reject, remove), note (at least ten characters), and expectedVersion (current integer). Transitions are fail-closed and version-checked.

**POST /api/v1/noogle/knowledge/contributions/{uuid}/withdraw:**
Author or reviewer can move work to removed, using a note and current version.

**GET /api/v1/noogle/knowledge/contributions/{uuid}/audit:**
Submitter or active reviewer can read events and integrity results.

**GET /api/v1/noogle/knowledge/moderation?state=submitted&limit=30:**
Reviewer-only queue. No public moderation listing.

## State machine

- submitted → validated → attributed → approved, requiring independently authenticated reviewers.
- disputed and removed retain historical audit events.
- **approved means review completed, not indexed or published.** Separate provenance inspection and static release manifest authorize publication. No HTTP route in this gate may mark an item indexed.

## Production activation checks — not yet satisfied

1. Verify production NEOpass signing and authoritative active-member registry; never trust x-neopass-subject or unsigned role headers.
2. Provide a durable, backed-up persistent store path. In-memory/ephemeral Cloud Run SQLite is insufficient. Test restore, migrations and corruption handling first.
3. Explicitly inject the verified authService and knowindexContributionLedger into the backend and set knowindexWriteEnabled true only after checks. The generic backend startup currently does neither.
4. Verify trusted origins, TLS, JWT expiration, rate limits, request-size limits, audit integrity, and rejection modes in the actual hosting environment.
5. Test a real contributor submission, second-person approval, withdrawal, idempotent retry, and rollback.
6. Never include user-submitted material in the public Noogle index without a separate publication gate. Record audit head hashes in an external immutable store to detect privileged database tampering.

## Rollback

Disable the write flag or unbind the runtime service; keep public Noogle search running. Preserve records and audit events on persistent storage. A reviewer can remove an approved contribution. Removing already published material from the Noogle snapshot requires a separate GitHub Pages release, including removal evidence.

## Scope

KNOWINDEX token issuance, transfers, wallet custody, and NEO Crown Chain transaction signing remain **read-only integration workstreams**. No on-chain writes are implemented or authorized in KI-014.
