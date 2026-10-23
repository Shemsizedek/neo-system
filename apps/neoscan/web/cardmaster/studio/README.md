# NCC-009 — NEO Crown Artwork Studio

**Status:** free-tier staging feature, not production and not an integrated AI illustration service.

## Access

- Gallery: `https://neo-crown-cardmaster-runtime.onrender.com/`
- Studio (after NCC-009 staging deployment): `https://neo-crown-cardmaster-runtime.onrender.com/studio/`
- Source branch: `feat/ncc-009-crown-art-studio` stacked on existing Crown staging `feat/ncc-007-render-runtime-hardening`.

## What works

- Three Crown registry cards, four constrained palettes, three composition templates and deterministic seed variations.
- Both faces rendered as real self-contained 720x1040 SVG vector artwork, with no external images, scripts, remote fonts or wallets.
- Client-side PNG conversion at 1440x2080, SVG downloads, and JSON metadata with exact SHA-256 digests for both faces.
- Revision sequence, prior front-art hash reference, up to 12 browser-local history entries and validation of saved digests on restore.
- Copyable creative brief for a separately authorized third-party AI illustration service, **without making any AI request**.
- Read-only on-demand Counterparty order evidence. No price, yield, target or market data burned into collectible artwork.

## Scope boundaries

- `ai_generated: false`, `ai_provider: null`, `public_release_approved: false`, `issuer_verified: false`, `backing_verified: false`.
- SHA-256 metadata is an **unsigned off-chain integrity record**. It is not a blockchain transaction, timestamp attestation, ownership certificate, mint, licensing claim or proof of issuer control.
- No API keys, cloud image-generation API calls, paid plans, issuance, offers, custody or signing.
- Artwork is generated inside the user's browser; only user-triggered market checks access the existing public read-only Render API.
- Version history is browser-local and can be erased by user clearing storage. Export SVG, PNG and JSON for durable copies. Do not store sensitive identifiers in the freeform creative title.

## Security

- Studio code contains no arbitrary URL/provider input. Card IDs, templates, palettes and edition values are allowlisted or bounded.
- All freeform title text is XML-escaped inside SVG and written as DOM text in the UI.
- Runtime only serves a pinned studio file allowlist; POST and unknown paths fail closed.
- CSP only adds `blob:` to `img-src` to preview locally generated SVG/PNG. It does **not** permit unsafe inline scripts or remote image endpoints.
- `<meta name="robots" content="noindex,nofollow">` keeps staging out of search engine indexing requests.

## Tests

From repository root:

```bash
node --test server/crown-metadata/cardmaster*.test.mjs api/crown/cardmaster.test.mjs deploy/crown-cardmaster-render/*.test.mjs
node scripts/generate-cardmaster-gallery.mjs
```

Test matrix: all combinations of 3 assets x 4 palettes x 3 templates x 2 faces, malicious-input escaping, deterministic variant hashing, digest chain, manifest schema, HTTP file allowlist, CSP, invalid methods.

## Validation gates before production

1. Verify GitHub standard CI, Render build tests and a live HTTPS smoke.
2. Verify real browser navigation, SVG preview, face switching, PNG download, JSON download and browser-local revision restoration. The initial local Chromium environment blocks all navigations; do not infer a visual/interaction pass from Node tests alone.
3. Reconcile broad monorepo inventory drift and dependency-advisory backlog.
4. Obtain original-art image-rights/brand approval and financial marketing/compliance review.
5. Only after explicit pricing/credential approval connect a real AI image provider on a separate, credential-isolated service; never send secrets to the browser.
6. For rollback, deploy the prior NCC-008 verified commit to the existing staging service. Keep auto-deploy off and the NCC-006 static site intact.

## Next architecture decision

When a verified *free* provider is available, add a separate image generation adapter with user-triggered requests, explicit daily quotas, authentication, cost caps, rights tracking, content moderation and generated-image provenance. The procedural renderer is always the no-cost fallback.
