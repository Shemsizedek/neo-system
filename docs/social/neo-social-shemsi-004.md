# NEO-SOCIAL-SHEMSI-004 — Automated Ingestion + Readback

This gate adds authorized comment ingestion, deterministic triage, account/author identity separation, and post-publication readback verification.

## Supported automated sources

### LinkedIn
- Reads comments from the versioned LinkedIn `socialActions/{activityUrn}/comments` API.
- Filters comments authored by the configured NEO-owned actor.
- Preserves the external author identity separately from the authorized publishing account.
- Verifies a published reply by reading the created comment back from LinkedIn.

### YouTube
- Reads recent comment threads using YouTube Data API `commentThreads.list`.
- Supports channel- or video-scoped retrieval.
- Filters comments authored by the configured NEO-owned YouTube channel.
- Verifies a published reply with YouTube Data API `comments.list`.

## Triage

New comments are assigned deterministic operational signals:
- complaint/problem language -> high priority / human attention
- questions -> normal priority / reply recommended
- praise/thanks -> low priority / acknowledgement optional
- other content -> review

Triage does not auto-approve or auto-publish.

## API

- `POST /api/shemsi/sync`
- `POST /api/shemsi/drafts/:id/verify`

Both routes require trusted NEOpass identity. Unsupported platforms fail closed.

## UI

The Shemsi console can now:
1. select LinkedIn or YouTube;
2. provide an activity URN or video ID;
3. sync recent comments into the durable inbox;
4. choose a synced comment;
5. generate and approve a reply;
6. publish through an authorized adapter;
7. verify the platform receipt.

## Runtime requirements

Automated LinkedIn ingestion/readback requires `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_OWNER_URN`.

Automated YouTube ingestion/readback requires `YOUTUBE_ACCESS_TOKEN`; `YOUTUBE_CHANNEL_ID` is used for channel identity filtering and channel-scoped sync.

If these credentials are absent, the runtime returns `credentials-required` and does not claim ingestion, publishing, or verification succeeded.

## Next gate

**NEO-SOCIAL-SHEMSI-005** — durable OAuth/token lifecycle, scheduled ingestion triggers, inbox deduplication/cursors, and notification/approval routing.
