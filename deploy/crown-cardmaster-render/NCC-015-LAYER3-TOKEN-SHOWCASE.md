# NCC-015 — NEO Crown Chain Layer 3 Token Showcase Cards

**Project:** Project 144 / NEO Crown Chain | **Status:** staged in the existing Render Free Crown web service, after tests and deployment acceptance. No signing, on-chain issuance, paid image model or private-user data storage.

## Objective

Produce a premium front-and-back **Token Showcase Card on demand** from a Bitcoin/Counterparty asset ID, or from a pre-issuance design proposal. Cards are artistic/metadata presentations and never themselves issue securities, digital tokens, new NFT uniqueness, claims rights, deposit balances, collateral or wallet custody.

This release reuses the **user's pre-existing Layer 3 code from the repository default branch**:
- `server/crown-metadata/showcase-intelligence-v1.mjs` — rule-based Counterparty/issuer-linked classification and descriptive source attribution
- `server/crown-metadata/investment-card-engine.mjs` — 18 categories, financial figures all tagged requiring verification, reproducible integrity hashes
- `server/crown-metadata/resolver.mjs` — Counterparty Core asset readback plus bounded metadata fetch, with public IPv4 DNS checks and one-minute cache
- `server/crown-metadata/server.mjs` — the separately deployable legacy showcase/investment-card API retained as compatibility code

NCC-015 connects these modules to the **existing** `deploy/crown-cardmaster-render/server.mjs` read-only HTTPS runtime, and adds a new professional procedural-art face/back renderer.

## Operator URLs

```text
https://neo-crown-cardmaster-runtime.onrender.com/showcase/
https://neo-crown-cardmaster-runtime.onrender.com/api/crown/showcase?asset=NOMNI
https://neo-crown-cardmaster-runtime.onrender.com/api/crown/showcase?asset=NOMNI&format=svg&face=front
https://neo-crown-cardmaster-runtime.onrender.com/api/crown/showcase?asset=NOMNI&format=svg&face=back

# Example pre-issuance proposal; this never verifies Bitcoin issuance:
https://neo-crown-cardmaster-runtime.onrender.com/showcase/?mode=preview&asset=NEOBOND&instrument_type=bond&style=aurum
```

## Generation modes

**Observed asset:** `GET /api/crown/showcase?asset=<ASSET>&mode=observed&format=json|svg&face=front|back&style=auto|aurum|emerald|azurite|violet|copper`.

- The source must resolve an actual Counterparty Core v2 asset and its identifier must match. Third-party issuer metadata (if available) is interpreted only as **issuer-declared and unverified**; asset-name patterns are **provisional**. The asset record itself is an observation, not verified wallet control or signed issuance receipt.
- If the metadata URL is inaccessible (as `crown.holytemples.org` currently may be), the card remains generic/unclassified rather than guessing its financial kind. It never invents a quote, supply or investment yield.
- Network and classification cannot be overridden through the issued-asset API. Renderer color **style** is a cosmetic selection only, not evidence of actual instrument type.
- Runtime source failure returns HTTP 503 rather than inventing chain evidence.

**Unissued design:** `GET /api/crown/showcase?mode=preview&asset=<NAME>&instrument_type=<TYPE>&network=<PROTOCOL>&style=<FINISH>&title=<OPTIONAL>&format=json|svg`.

- Makes instant off-chain design cards for **all 18 existing Layer 3 categories**: real estate, business acquisition, private equity, venture capital, private capital, shares/equity, bonds, notes, investment pool/fund, portfolio, index, insurance policy, insurance claim, NEO project, collectible/NFT presentation, utility, currency and generic/unclassified.
- Supports design previews for Counterparty, Runes, Ordinals, Taproot and other Bitcoin contexts. **Only Counterparty is connected to a real mainnet readback** in this release. The others do not imply a working issue/signing adapter or verified instrument.
- Every draft has visible `UNISSUED · DESIGN PREVIEW` lettering, `safe_to_issue:false`, null ledger/supply/price, financial/documentary verification flags false, and an off-chain content SHA-256.
- Drafts are stateless; no records or media are publicly uploaded from the browser and no external AI-provider credits are consumed.

## Exports

- `format=json`: normalized Layer 3 `payload`, deterministic sorted-key SHA-256 `integrity`, source/evidence and claim status flags. SHA-256 is an **off-chain content integrity checksum**, not a wallet signature or Bitcoin anchor.
- `format=svg&face=front|back`: directly renderable 720 × 1040 script-free vector artwork with on-card warning. Instrument-specific motifs and color palettes, no external image URLs or remote fonts, no AI calls. CSP `default-src 'none'; sandbox`.
- Browser buttons can download SVG, **1440 × 2080 PNG** via local browser Canvas and JSON provenance. PNG is a client-side rasterization, not a server PNG API; requesting `format=png` returns HTTP 400.
- Both live and preview modes are GET-only. Unsupported parameters, duplicate asset identifiers, untrusted URLs, observed type overrides, invalid asset IDs or attempts at writes fail closed.

## Integration with confirmed issuance

The NCC-013 approved pre-sign metadata and Counterparty-confirmation workflow remains separate. Once an approved instrument **actually exists** in Counterparty Core and its public metadata has been made available at the canonical URL, the observed-asset generator can show it on demand without adding a new hardcoded card or making a token transaction.

Remaining work for **fully automatic per-issuance publication**: connect the real signer/event source and reviewed metadata upload to an authenticated durable publisher; ensure `crown.holytemples.org/assets/<ASSET>/tokenscan.json` returns direct 200 before signing; confirm TokenScan's enhanced-information section independently. None of this is required to generate an **unsigned preview** or a **public-ledger-observed showcase**.

The WordPress canonical host route and TokenScan enhanced information issue (#1234) are **not solved** merely by offering a showcase generator at Render. Preserve Crown trust/agent enrollment routes on `crown.holytemples.org`; do not point the whole hostname at the static site.

## Testing and release

```bash
npm run crown:layer3:test
npm test
node --test deploy/crown-cardmaster-render/server.test.mjs
```

Acceptance: preview for every declared category, observed NOMNI with independent Counterparty Core readback, honest provenance/null quote, source failure classification, view/export of front and back, browser PNG and JSON downloads, no writes or wallet requests, and no regression to gallery, Studio, NOMNI metadata diagnostics or Counterparty order-evidence endpoints.

**Rollout boundary:** existing free Render staging service only, branch `feat/ncc-007-render-runtime-hardening`; no production main merge, DNS change, paid service, financial offer, signing action or blockchain transaction.
