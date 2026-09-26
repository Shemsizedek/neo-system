# NEO-SOCIAL-SHEMSI-003 — Durable Engagement Queue + Reply Execution

This gate moves Shemsi from a transient drafting surface into the NEO Social control plane.

## Durable workflow

```
comment intake
  -> subject-scoped durable inbox
  -> NEO AI draft generation
  -> durable draft
  -> explicit human approval
  -> reply execution adapter
  -> normalized receipt
  -> duplicate-safe receipt replay
```

Production storage uses the existing `NEO_SOCIAL_AUTOMATION_BUCKET` through the Cloud Run deployment identity. No static GCP credential is committed.

## API

Authenticated NEOpass routes:

- `GET /api/shemsi/inbox`
- `POST /api/shemsi/inbox`
- `GET /api/shemsi/drafts`
- `POST /api/shemsi/drafts`
- `POST /api/shemsi/drafts/:id/approve`
- `POST /api/shemsi/drafts/:id/publish`

A publish request is rejected unless the stored draft is already approved by the authenticated subject. Existing receipts are replayed instead of issuing another external write.

## Platform adapters

Direct reply execution is implemented for:

- LinkedIn nested comments through the versioned LinkedIn Comments API.
- YouTube replies through YouTube Data API `comments.insert`.

The runtime requires server-side credentials. If credentials are absent, the receipt reports `credentials-required` and does not claim publication.

Facebook, Instagram, X, and TikTok remain fail-closed as `adapter-not-configured` until their authorized reply routes are implemented and verified.

## UI

The Shemsi surface now requires real platform identifiers before queueing:

- authorized account/page ID
- comment ID
- parent post/activity/video ID

Generation, approval, and publication are three separate operator actions.

## Next gate

**NEO-SOCIAL-SHEMSI-004** — automated authorized comment ingestion/readback, queue triage, platform-specific identity resolution, and receipt verification.
