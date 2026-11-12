# NEO Bulletin Gate 4 — editorial approval and Marketer handoff

## Workflow (Gate 7 prepublication correction)
1. The daily Bulletin agent drafts and performs automated evidence checks. AUTO-CLEARED_FOR_DRAFT_REVIEW means only that the *draft* passed routine agent checks; it is **not** human authorization.
2. A real authorized editor reviews the draft, its primary sources and significant contrary evidence. For legal or rebuttal items, an independent second authorized reviewer must be recorded.
3. Before WordPress publication, the restricted operator verifies the draft via authenticated WordPress `context=edit`, verifies the reviewer against the operator-controlled allowlist, and signs the draft's rendered-content SHA-256. The output is a signed prepublication approval. Never forge a reviewer identity from a task result.
4. A signed approval is saved as a private file with no overwrite. Optionally, after the separate Neon migration and secure networking/roles are configured, also store an idempotent immutable approval receipt in `neo_bulletin.editorial_approvals`. Fail closed on conflicting receipts. **No live database insert has been verified at this gate.**
5. WordPress publication is a **separate, explicit owner-authorized release action**. Do not publish merely to test the signature. Once released, the independent release worker reads back the public WordPress post and verifies exact content digest, category, slug, status, HTTPS domain, and the prepublication signature.
6. The signed Marketer handoff queues a deduplicated record, where deployed. This does **not** enable social distribution or subscriber emails. Keep World Bulletin routing locks intact.

## Operator commands (Node 24)
Tests: node --test agents/neo-bulletin/*.test.mjs server/neo-marketer/*.test.mjs
Sign: node agents/neo-bulletin/approve.mjs private/review.json private/approval.json
Prepare: node agents/neo-bulletin/release.mjs private/approval.json
Send to Marketer *after deployment and review*: NEO_BULLETIN_SEND_MARKETER=1 node agents/neo-bulletin/release.mjs private/approval.json

## Review record
Input JSON fields: postId (integer), type (education|doctrine|historical|legal|rebuttal), approvedBy (verified reviewer identifier), secondReviewer (distinct verified reviewer for legal/rebuttal), sourceUrls (at least two primary or reliable HTTPS links), evidenceReviewed:true, fairReplyReviewed:true.
Also supply humanReviewConfirmed:true. The operator must configure NEO_BULLETIN_AUTHORIZED_REVIEWERS as a comma-separated allowlist and authenticated WordPress edit credentials; usernames alone are not proof of real-world reviewer identity. Draft #3868 remains a draft; no publication is required or authorized for this test.

## Separate secret domains
- NEO_BULLETIN_REVIEW_SECRET: editorial signing key, random 32+ character value, restricted to approved operator; not in GitHub.
- NEO_BULLETIN_AUTHORIZED_REVIEWERS: operator-managed, comma-separated list of approved reviewer IDs, whose access and real identities must be authenticated operationally.
- NEO_BULLETIN_WP_USERNAME / NEO_BULLETIN_WP_APP_PASSWORD: private least-privilege WordPress credentials for authenticated readback of unpublished drafts. Never commit them.
- NEO_BULLETIN_LEDGER_DB_URL: optional protected Neon connection for append-only approval receipt. Migration `server/neo-marketer/migrations/002-bulletin-editorial-approvals.sql` must be applied with an authorized administrative identity. Runtime should have INSERT/SELECT only; no UPDATE/DELETE/DDL.
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


## Gate 7 implementation evidence and limitations
- PR #1399 branch `feat/neo-bulletin-approval-handoff`: prepublication signing code, isolated regression tests, optional append-only SQL receipt adapter and migration. A WordPress draft is verified with authenticated edit context; a published post cannot receive a *new* draft approval.
- Approval receipts have the deterministic key `review-{postId}-{contentSha256[0:16]}`. Identical retries return `already_recorded`; differing receipts with the same key fail with `approval_receipt_conflict`.
- The protected Neon staging project `red-wind-26570753` currently reports `block_public_connections: true`. An attempted schema inspection was rejected from this connection. This gate **did not execute the new migration**, connect the ledger, deploy any service, sign a real human review, publish, or dispatch anything.
- The operator-provisioned ID allowlist prevents arbitrary reviewer labels but does not itself authenticate an individual. Use verified logged-in identities, controlled credentials, and audit records before real releases; high-risk items still require true independent reviewer signoff.
- A WordPress editor or plugin may modify HTML when publishing. Hash mismatch is an intended stop condition requiring comparison and a new review; never auto-resign.
- Release CI alone cannot prove Neon persistence, secure network connectivity, application credential provision, Render deployment, reviewer authority or publish readiness. PR remains draft until deployment effects and conflict checks are resolved.
