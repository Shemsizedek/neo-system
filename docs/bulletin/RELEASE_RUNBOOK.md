# NEO Bulletin Gate 4 — editorial approval and Marketer handoff

## Workflow
1. The daily agent prepares source-linked draft worksheets, without public publishing.
2. A real editor reads primary documents and contrary material, and uses the normal WordPress interface to publish a reviewed article.
3. A restricted editorial operator signs an approval for the *published* WordPress content using a secret held outside GitHub.
4. The release worker reads back the WordPress post and checks its category, publication status, site host, exact rendered content hash and approval.
5. A separate HMAC authenticates the release to Marketer. Marketer queues a deduplicated record on a persistent disk. No social posts or subscriber messages are sent.

## Operator commands (Node 24)
Tests: node --test agents/neo-bulletin/*.test.mjs server/neo-marketer/*.test.mjs
Sign: node agents/neo-bulletin/approve.mjs private/review.json private/approval.json
Prepare: node agents/neo-bulletin/release.mjs private/approval.json
Send to Marketer *after deployment and review*: NEO_BULLETIN_SEND_MARKETER=1 node agents/neo-bulletin/release.mjs private/approval.json

## Review record
Input JSON fields: postId (integer), type (education|doctrine|historical|legal|rebuttal), approvedBy (verified reviewer identifier), secondReviewer (distinct verified reviewer for legal/rebuttal), sourceUrls (at least two primary or reliable HTTPS links), evidenceReviewed:true, fairReplyReviewed:true.
Post 3861 is currently a draft and is therefore **not** eligible for signed release. Do not publish it just to make a test pass.

## Separate secret domains
- NEO_BULLETIN_REVIEW_SECRET: editorial reviewer signing key, random 32+ character value, restricted to approved operator; not in GitHub.
- NEO_BULLETIN_MARKETER_ENDPOINT: exactly https://marketer.holytemples.org/api/marketer/bulletin-intake
- NEO_BULLETIN_MARKETER_SHARED_SECRET: shared signing key used by release worker.
- NEO_MARKETER_HANDOFF_SECRET: server-side copy of shared transport key; must match the previous value.
- NEO_MARKETER_HANDOFF_DIR: persistently backed writable queue path. Ephemeral container storage is not sufficient.
- NEO_BULLETIN_SEND_MARKETER: set to 1 only when the release has been checked and transport is ready.
Never disclose secret values in repository files, chat messages, pull requests, or issue comments. Protect approvals with access control and logs. A name string by itself does not authenticate an actual reviewer.

## Safety gates
Approval hashes prove integrity, not factual truth. Editors must verify the specific claims against cited passages, account for significant counterevidence, and request legal review for sensitive accusations. Rebuttals and legal classifications require two actual independent reviewers, verified operationally (software checks that the recorded identifiers differ).
Changes to a published article invalidate its approval. A corrected article must be reviewed and re-signed. Never auto-post to social networks or label critics criminals without reliable records.

## Deployment gates and rollback
- Do not merge solely because unit tests pass: changes to server/neo-marketer are eligible for the existing Cloud Run deployment workflow. Verify intended platform and spending first.
- Choose an authorized durable volume or database for queued records; test persistence, backups, restart and incident alerts.
- Verify origin TLS, live WordPress readback and accepted queue receipt (201 queued, 200 already_queued).
- Leave outward distribution disabled until a separate approved campaign adapter is tested.
- Rollback by disabling the intake transport secret, reverting the change, and preserving queued records for audit.
- Preserve World Bulletin and Noocracy/NOMNI routing locks.

## Evidence status
GitHub CI success proves mock WordPress readback, approval verification and queue behavior in tests. It does not establish production deployment, live source retrieval, durable cloud storage or completed public distribution.


## Gate 5 — optional existing Neon queue
The same authenticated intake can use Neon/Postgres rather than ephemeral file storage. The new adapter is additive and only active when a protected `NEO_MARKETER_HANDOFF_DB_URL` is supplied. Without that variable, the existing disk-backed queue path remains available. Keep `NEO_MARKETER_HANDOFF_SECRET` set separately. If both storage backends are absent, intake responds with 503.

- Migration: `server/neo-marketer/migrations/001-bulletin-queue.sql` is additive and must be reviewed and applied explicitly by a database administrator. No migration is executed at startup.
- Runtime dependency: `server/neo-marketer/package.json` declares `pg`; `deploy/neo-marketer/Dockerfile` installs production dependencies. This PR **still affects the legacy Cloud Run deployment path** if merged into main.
- Access: the Neon approvals-staging database project identified in Gate 5 has inbound network restrictions and could not be inspected or modified by this connector. No migration was applied. Do not use unrelated production accounts or disable protected-network settings to force deployment.
- Queue state is limited to `pending_editorial_marketing_review`; social distribution and automated article publication are not enabled.
- The Marketer service must use a scoped Postgres role with only INSERT and SELECT permissions for this schema, rotation and revocation procedures, backups, and restart checks.
- Unit tests use an injected query adapter to verify parameterization and idempotence. They do not prove a real Neon connection, database persistence, backup restoration, or live public deployment.

## ChatGPT editorial automation status
The separate NEO Bulletin Editorial Desk task had a completed recorded run requiring user action and was observed disabled on November 10. It was re-enabled through the task-management integration in Gate 5. A new successful scheduled execution has not yet been observed; do not represent it as continuously operational.

## Gate 6 — isolated Neon staging verified (2026-11-10)
- Created Neon Free-plan project `neo-bulletin-staging` (project `red-wind-26570753`), branch `br-mute-shadow-bbxba6r9`, database `neo_bulletin`.
- Applied the additive migration: `neo_bulletin.marketer_queue` exists; verified 2 indexes, 0 queued records.
- Created restricted runtime role `neo_bulletin_marketer_intake`; verified SELECT and INSERT, but not UPDATE or DELETE, by querying as that role.
- Public Neon connections were temporarily allowed for administration, then blocked again; final project readback confirmed `block_public_connections: true`. This means ordinary public Render connections will not work until an approved private connectivity arrangement is established. Do not disable this protection silently.
- The role password was returned during provisioning and must be rotated before any runtime deployment; do not copy it to code, tickets, or logs. No service secrets are configured.
- GitHub CI for PR head `db93073393ebac13ae7736695a0cdf19d1d40856` succeeded (Bulletin Agent and general CI). PR #1399 remains a draft; merging may trigger legacy Cloud Run deployment. No live Marketer service or end-to-end signed handoff was verified.
- Next gate: rotate runtime credential through approved secret storage, select an authorized network path from Render to Neon, configure separate HMAC secrets, deploy isolated staging, test an authorized synthetic handoff and restart persistence, then inspect audit logs. Keep public distribution disabled.
