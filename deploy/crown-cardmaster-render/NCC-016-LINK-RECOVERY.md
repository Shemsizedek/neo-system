# NCC-016 — Layer 3 Showcase Shared-Link Recovery

**Scope:** Existing `neo-crown-cardmaster-runtime` Free Render staging runtime, read-only only.
**Issue reported:** Clicking a card link showed `{"error":"unsupported_or_duplicate_parameter"}`.

## Diagnosis

The Layer 3 read-only `/api/crown/showcase` route from NCC-015 rejected *every* unknown query key and *any* duplicated key. In particular, a URL copied from HTML with `&amp;` in place of `&` produces a parameter key such as `amp;format`. Some chat/social clients also append tracking fields such as `utm_source`, `ref`, `fbclid`, or `gclid`. All of those previously returned the same bare JSON error, even though the token's public record itself was unaffected.

The exact malformed user URL wasn't captured, so **we cannot prove which parameter variant caused that one click**; NCC-016 fixes both common share-link failures without weakening the significant parameter rules.

## Fix

`server/crown-metadata/showcase-query.mjs` normalizes incoming query parameters before Layer 3 checks:

- Recognizes exactly the existing eight semantic keys: `asset`, `mode`, `instrument_type`, `network`, `title`, `style`, `format`, `face`.
- Accepts exactly one leading HTML-entity prefix `amp;` for a semantic or tracking key, e.g. `amp;format=svg`. Produces the same request as `format=svg`.
- Ignores an allowlist of nonsemantic social/referral tracking keys and `utm_...` keys; **tracking cannot modify card content, ownership, chain identity, classification or issuance status**.
- Treats repeated *identical* selectors as idempotent. Rejects conflicting asset, network, instrument and other selector values, rather than arbitrarily choosing one.
- Rejects any unsupported selector, embedded file paths (through existing asset validation), query strings over 2400 characters, and more than 24 parameters.
- Unknown/conflicting parameters now receive HTTP 400 with a helpful explanation and `studio_url:'/showcase/'`. A malformed link **never** causes a blockchain transaction, signing, on-chain issuance or a public data write.
- Retains the on-chain observer source, price/rights/issuer-control restrictions, evidence-status rules and all original read-only HTTP security behavior.

The Layer 3 studio adds a **Copy verified card link** button. This produces a canonical `/showcase/?asset=...&mode=...&...` URL from its own validated controls, not a raw API response or third-party tracker. Existing front/back SVG and JSON download controls are unchanged.

## Reproduction and acceptance

Before fix, requests such as these returned the opaque error:

```text
/api/crown/showcase?asset=NOMNI&amp;format=svg&amp;face=front
/api/crown/showcase?mode=preview&asset=NEOBOND&instrument_type=bond&utm_source=chatgpt
/api/crown/showcase?asset=NOMNI&asset=NOMNI&format=json
```

All three **must now succeed** while the following remain HTTP 400:

```text
/api/crown/showcase?asset=NOMNI&asset=NOTNOMNI
/api/crown/showcase?asset=NOMNI&issuer_verified=true
/api/crown/showcase?asset=NOMNI&mode=observed&instrument_type=bond
```

Run `npm run crown:showcase:links:test`, full `npm test`, and the live `Crown CARDMASTER staging HTTP smoke` GitHub Actions job after deploying the existing Render service.

## Safe access links

- Operator studio: `https://neo-crown-cardmaster-runtime.onrender.com/showcase/`
- Existing NOMNI card: `https://neo-crown-cardmaster-runtime.onrender.com/showcase/?asset=NOMNI`
- Unissued bond **design preview**: `https://neo-crown-cardmaster-runtime.onrender.com/showcase/?mode=preview&asset=NEOBOND&instrument_type=bond`

**Unchanged blockers:** `crown.holytemples.org` canonical TokenScan metadata availability, verified enhanced TokenScan ingestion, authenticated real issuer signing, Runes/Ordinals readback adapters. None of these are fixed or represented as issued by this query change.

## Rollback

Revert only NCC-016 code on `feat/ncc-007-render-runtime-hardening`, rebuild/redeploy the existing Render Free service and run the HTTP smoke. Do not change domain DNS, static site, WordPress plugins, wallet keys, fees or network transactions.
