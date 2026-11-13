# Project 144 — FWKF Gate 020: Foundation brand and isolated Knowledge Forum alpha

**Date:** 2026-11-01  
**Status:** Brand and prelaunch interface LIVE; isolated Neon staging and Managed Auth PROVISIONED; public Forum registration/posting NOT ENABLED.

## Brand deliverables
- Created a cohesive navy/gold/cream globe-and-open-book identity: `apps/fwkf-worldcafe/public/logo.svg`, `favicon.svg`. Rendered separate portable PNGs (logo 2100×520, favicon 512×512 plus 192 and 32 variants) as local deliverables.
- Applied SVG favicon to the original full Foundation home and all seven existing World Café / informational pages. Applied the icon in the header and the wordmark in the modern site's light footer. Added social logo metadata.
- Kept all original Foundation sections/navigation and the separate modern World Café experience. Did not publish a generated status infographic or make false completion claims about the forum.
- Public asset URLs: `https://worldcafe.holytemples.org/logo.svg` and `https://worldcafe.holytemples.org/favicon.svg`.

## Cloud staging environment
- Existing Neon project `neo-twlf-forum`: `purple-waterfall-10955254`, free_v3 subscription, AWS us-east-1. Main branch `br-young-brook-b8quup3r` untouched; main Neon Auth remains disabled.
- Created child branch `fwkf-forum-g020-staging`, id `br-misty-sun-b850yi7t`, expiry `2026-11-15T23:00:00Z`. Provider refused manual suspend-timeout adjustment, so branch uses supported defaults. No new paid plan purchased.
- Enabled branch-scoped Neon Managed Better Auth (Better Auth), with `neon_auth` schema and an isolated branch auth base URL. No public trusted-origin config or app sign-up exposure enabled.
- Applied the reviewed `apps/fwkf-forum/migrations/0001_forum_schema.sql` via Neon single transaction on **child branch only**: seven `fwkf_forum` tables (communities, members, posts, replies, votes, reports, moderation_actions) and default closed/pending content permissions.
- Verified via Neon table inventory and a read-only aggregate query: 0 communities, 0 posts, 0 members, 0 moderation actions. No private Project 144 conversations or real users inserted.

## Forum user interface
- Built `apps/fwkf-forum/web/preview.html` and synchronized `apps/fwkf-worldcafe/public/forum-preview.html`. This is a responsive, accessible prelaunch interface showing categories, topic filtering, empty question feed, and privacy/moderation-first messaging.
- Linked preview from `/forum.html`; all write requests, registrations, fake posts, third-party data collection, and live conversations remain disabled.
- Live preview `https://worldcafe.holytemples.org/forum-preview.html` independently checked HTTP 200 with clear “Private alpha — posting closed” and “No public questions yet”.
- Added SDK-facing `apps/fwkf-forum/web/auth-sdk.mjs` to use official `@neondatabase/auth` package in a later bundled app, with no sign-up method. This module is **not built or deployed into an actual sign-in flow yet**.

## Security and tests
- Existing suite verifies questions, replies, reports, votes, moderator permissions, SQL parameterization and JWT rejection. Added `src/auth-neon-jwt.mjs` and tests for Neon Managed Auth **EdDSA/Ed25519** tokens, while preserving legacy RS256 verifier tests; roles always come from DB, not token assertions.
- Added `scripts/verify-fwkf-gate020.mjs` to enforce branding on eight site pages, identical preview source, no public signup, no sensitive operational content.
- GitHub Actions World Café quality gate completed successfully for commit `55f8f9c3f6d602c1d818422f33b9d4e719f90865`. Newer CI runs may be pending; report only verified conclusions.
- Render deployment `dep-dbjrphu7bikc738cfojg` reported `live`, and fresh HTTPS readback confirmed the Forum preview and World Café navigation. Firecrawl cannot parse raw SVG image assets; source-level CI and deployment are the SVG evidence.
- **Not verified:** a live test user signing up/in/out, actual JWKS audience/issuer against a real token, browser-to-Neon-Postgres publishing, backup/restore, moderator operational staffing. A real staging Auth provider exists; that alone is not a working authenticated forum.

## Next gate — Forum 021
1. Configure a private test-host origin and a complete official Neon Auth SDK login/session/token flow, with proof from a real test user.
2. Bundle the Forum app and deploy isolated preview (not tied to existing `forum.holytemples.org` or TWLF). Wire a least-privilege Postgres adapter behind a Neon Function; read-only by default.
3. Run end-to-end cross-user checks of question submission, moderation queue, approval, replies, votes, reporting, abuse prevention, privacy and restore.
4. Publish real Forum after documented governance, community rules, staffing, legal/privacy review, controlled signup and successful tests. Penguin is not required.
