# Noogle Crawler + Index Store

This maturity gate gives Noogle its first native corpus pipeline.

## Runtime components
- `crawler.mjs` — fetches public HTTP(S) text content, follows redirects, normalizes canonical URLs, extracts title/summary, and hashes source content with SHA-256.
- `store.mjs` — persists and searches the Noogle Index v1 document store.
- `search.mjs` — exposes the native result contract consumed by Omnitrix or a future backend API.
- `scripts/build-noogle-index.mjs` — builds a public index snapshot from allowlisted seed sources and publishes it under `/api/noogle/index.json` during GitHub Pages builds.

## Operational policy
The crawler is intentionally constrained to public HTTP(S) sources. It does not bypass authentication, robots/access controls, CAPTCHAs, paywalls, private networks, or restricted services. Source classification and evidence state remain explicit in each record.

## Next service boundary
The static Pages snapshot is a bootstrap implementation. A persistent production index should move into a dedicated service/database with crawl queues, robots policy evaluation, deduplication, scheduled refresh, content chunking, language detection, community-source submissions, and authenticated curator workflows.
