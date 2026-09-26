# NEO-SOCIAL-SHEMSI-005 — Durable OAuth + Scheduled Approval Queue

This gate makes comment ingestion restart-safe and scheduler-ready without weakening the human approval boundary.

## Durable OAuth lifecycle

The social gateway now stores OAuth states and provider connections in the private NEO Social GCS bucket instead of process memory.

- OAuth state is single-use.
- Provider connections are subject-scoped.
- Access and refresh tokens remain server-side.
- Expiry timestamps are persisted.
- Near-expiry connections use refresh-token exchange when a refresh token exists.
- Missing refresh capability returns reauthorization-required rather than silently failing open.

LinkedIn Shemsi ingestion can resolve the subject's stored OAuth connection before falling back to explicitly configured server credentials.

## Scheduled ingestion

A new workflow, `.github/workflows/shemsi-comment-sync.yml`, calls:

`POST /automation/shemsi/sync`

once per hour using the existing NEO Social automation bearer token.

The endpoint:

1. authenticates the automation caller;
2. resolves the configured Shemsi owner subject;
3. reads configured LinkedIn/YouTube targets;
4. ingests supported comments;
5. stores only previously unseen comment IDs;
6. persists sync cursor metadata;
7. creates a pending approval notice for each new comment;
8. never approves or publishes a reply.

## Approval queue

Authenticated operators can read:

`GET /api/shemsi/approvals`

Notices are subject-scoped and contain only routing metadata needed for review: inbox ID, platform, priority, disposition, status, and creation time.

## Production configuration

The Cloud Run deployment accepts these repository/environment variables:

- `SHEMSI_AUTOMATION_SUBJECT_ID` — NEOpass subject that owns the scheduled queue.
- `SHEMSI_LINKEDIN_ACTIVITY_URNS` — semicolon-delimited activity URNs.
- `SHEMSI_YOUTUBE_VIDEO_IDS` — semicolon-delimited video IDs.

The scheduled GitHub workflow uses the already-established:

- `NEO_SOCIAL_GATEWAY_URL`
- `NEO_SOCIAL_AUTOMATION_TOKEN`

If the owner subject is not configured, scheduled ingestion returns a controlled configuration error and does nothing.

## Dedupe and cursor behavior

Inbox IDs remain deterministic by platform/account/comment ID. Scheduled ingestion uses create-only writes, so replaying the same source data does not create duplicate review work.

Sync state records the last run, number of newly added comments, and the YouTube next-page token when present.

## Approval boundary

Automation may ingest, classify, deduplicate, and notify.

Automation may **not** approve or publish.

The existing chain remains:

`new comment -> approval notice -> operator review -> draft -> explicit approval -> publish -> readback verification`

## Next gate

**NEO-SOCIAL-SHEMSI-006** — provider-specific inbox expansion for Facebook/Instagram/X/TikTok where authorized comment-read APIs are available, plus operator notification delivery channels.
