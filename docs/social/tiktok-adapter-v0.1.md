# NEO Social — TikTok Adapter v0.1

Status: scaffolded, approval-gated.

## Purpose
Distribute a successfully published World Temple article to TikTok as an image post while preserving HolyTemples.org as the canonical publication.

## Pipeline
WordPress publish success -> canonical article payload -> cover image URL -> TikTok caption -> approval gate -> TikTok Content Posting API -> publication receipt.

## Article payload
```json
{
  "title": "string",
  "canonical_url": "https://holytemples.org/...",
  "summary": "string",
  "cover_image_url": "https://...",
  "source_post_id": "string"
}
```

## Caption policy
1. Begin with the complete article title.
2. Follow with a concise article synopsis.
3. Identify World Temple / HolyTemples.org as the canonical source.
4. Never claim TikTok publication until the API returns a publication identifier/status.
5. Do not silently truncate the title.
6. Keep publishing approval-gated until the live test gate is explicitly promoted to automatic mode.

## Required secrets
Store only in the deployment secret manager / GitHub Actions secrets. Never commit values.

- `TIKTOK_CLIENT_KEY`
- `TIKTOK_CLIENT_SECRET`
- `TIKTOK_ACCESS_TOKEN` (or OAuth refresh-token flow)
- `TIKTOK_OPEN_ID` when required by the active API flow

## API boundary
The production adapter should implement TikTok's current Content Posting API rather than Windsor's analytics connector. Before deployment, validate the current TikTok developer app scopes, photo-post eligibility, token refresh behavior, media URL requirements, and publishing-status endpoint against TikTok's current official documentation.

## Safety / provenance
- Canonical article remains on HolyTemples.org.
- Social copy is derivative distribution metadata, not a replacement manuscript.
- Every request receives an idempotency key derived from source post ID + destination.
- Store source post ID, canonical URL, destination, request timestamp, TikTok publication ID/status, and failure reason.
- A failed social publish must never roll back or modify the WordPress article.
