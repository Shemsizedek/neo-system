# NCC-005 — NEO Crown CARDMASTER gallery

Status: **implemented in a draft branch, not deployed**. Depends on PR #1125 (`cardmaster.mjs`) and uses the existing `server/markets/ticker-service.mjs`. This is a Bitcoin / Counterparty-adjacent **presentation layer**, not an independent chain or a trading engine.

## Components

- `server/crown-metadata/cardmaster-gallery.mjs`: three seed records, attributed ticker policy, deterministic vector artwork for front/back, content hashing and unverified-claims provenance.
- `api/crown/cardmaster.mjs`: read-only `GET` API. JSON collection by default; SVG image with `?format=svg&card_id=NEO-CARD-000001&face=front|back`. `OPTIONS` supported; all write methods refused.
- `apps/neoscan/web/cardmaster/`: responsive offline gallery with 3D flip, JSON metadata, artwork prompt copy and a user-triggered market refresh. Offline seed data and six SVG assets are included for preview.
- `scripts/generate-cardmaster-gallery.mjs`: regenerates the offline catalogue and all six self-contained SVG assets from the source registry (no network calls).

## Local validation

From repository root:

    node --test server/crown-metadata/cardmaster.test.mjs server/crown-metadata/cardmaster-gallery.test.mjs api/crown/cardmaster.test.mjs
    node scripts/generate-cardmaster-gallery.mjs

Preview by serving `apps/neoscan/web/cardmaster/` as static files. The included `catalog.js` is an offline sample; it never contains a real market price.

## Market and risk rules

- The NEO ticker service supports NOMNI/USD as an **indicative DEX-derived cross-rate**, not a verified last trade. Its timestamp is the service retrieval timestamp; upstream order execution time and backing are **not verified**.
- Only fresh (under five minutes) supported quotes from a pinned set of recognized public sources can appear in the gallery. Invalid, stale, missing, unknown-origin or nonpositive data returns **no price**.
- Real estate and private equity have no public traded pair in this integration; their submitted values/ROI/statuses are *unverified operator claims*, not market quotes or audited figures.
- Record content hashes are off-chain data-integrity digests, not blockchain commitments, signatures, or issuer attestations.
- The card design is **generated local SVG vector artwork**, not AI-cinematic image generation. AI provider integration and image-rights review remain future work. Display art and market data remain separate so static artwork never freezes an obsolete indicative quote.
- No signing, minting, transfer, offering publication, wallet privileges, or payment routing exists in this implementation.

## Deployment/staging gates still open

1. Run tests in repository CI (the previous Vercel build-rate-limit status is not a passing CI signal).
2. Serve the draft gallery on a non-production staging host; test browser flip, metadata disclosure, image rendering and keyboard behavior.
3. Verify that the selected frontend host can fetch the target `https://neo.holytemples.org/api/crown/cardmaster` through live HTTPS/CORS; endpoints could not be reached by external verification when this work was prepared.
4. Validate fresh Counterparty open-order source data and disable price display if an upstream quote lacks source-level observation time. The existing service retrieval timestamp is *not* trade-time evidence.
5. Review financial disclosures, image rights, public seed figures and regulatory applicability before publication.
6. Take backup, document rollback, and approve promotion to main/WordPress or production hosting separately.

Rollback: revert the draft PR before merge; after deployment, remove/revert the new read-only serverless endpoint and static gallery bundle. Existing Crown auth, treasury data, asset metadata and WordPress plugins are not modified by this PR.
