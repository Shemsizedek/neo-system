# NCC-014 — Canonical NOMNI Metadata Readiness & DNS Cutover Plan

**Operator:** Project 144 / NEO Crown | **Date:** October 25, 2026
**Purpose:** distinguish source hosting, on-chain description, TokenScan's basic pointer, and the TokenScan enhanced-information display. This is a staging diagnostics gate, not wallet issuance or domain authorization.

## Independently verified inventory

- NOMNI's Counterparty Core mainnet asset description is `https://crown.holytemples.org/assets/NOMNI/tokenscan.json`.
- Counterparty Core's most recent NOMNI issuance entry at block **972822** is a zero-quantity `change_description` transaction. It is **not** a new token supply issuance.
- The original NOMNI issuer and current owner are different addresses; do not assume access to either wallet or broadcast an update.
- The on-chain hostname is `crown.holytemples.org`. Google DNS-over-HTTPS previously returned `A 34.172.66.0` and no CNAME/AAAA for the Crown subdomain; the authoritative zone uses WordPress.com nameservers.
- The connected WordPress.com site list shows the `holytemples.org` World Temple site as an accessible Atomic site, not a separately verified Crown domain-connected installation. Do not infer that a rewrite on the World Temple site will serve requests for `crown.holytemples.org`.
- The existing Crown Render **static** service ID `srv-dbdf3bnavr4c739rr9h0` serves `https://neo-crown-cardmaster-staging.onrender.com/assets/NOMNI/tokenscan.json`; its configured branch is `feat/ncc-005-cardmaster-gallery` and auto-deploy is disabled.
- The existing Crown Render **web** service ID `srv-dbdf9chsrm7s73bi3ptg` serves the same JSON from branch `feat/ncc-007-render-runtime-hardening`. Keep the Free web runtime for the gallery/Artwork Studio. The static site is a reliable **metadata origin**, but must NOT become the whole canonical hostname until every other existing Crown route is preserved and independently tested.
- TokenScan's NOMNI profile recently displayed **No additional information is available at this time**. Its `/api/asset/NOMNI` returns a basic on-chain description pointer and **cannot on its own prove enhanced-information ingestion**.
- **CRITICAL SHARED-HOST DEPENDENCY:** repository source `server/crown-auth/verify.mjs` calls the default `https://crown.holytemples.org/api/v1/trust/verify` (POST); `server/crown-workload-agent/server.mjs` and `server/etha-network/server.mjs` call `trust/challenge`, `trust/token`, and `trust/verify`; `apps/neoscan/web/crown-media.js` loads `/assets/<ASSET>/explore.html`; `server/crown-metadata/INVESTMENT-CARD-ENGINE.md` describes `/assets/<ASSET>/investment-card.json`. These dependencies exist in code, though live production availability has not been verified. Pointing the hostname directly to the static card host may break these routes.

## NCC-014 implemented status endpoints

- `GET https://neo-crown-cardmaster-runtime.onrender.com/metadata/` — responsive, read-only four-source diagnostic dashboard, no wallet or DNS actions.
- `GET https://neo-crown-cardmaster-runtime.onrender.com/api/crown/metadata-readiness?asset=NOMNI` — bounded source readback of **(1)** canonical `crown.holytemples.org`, **(2)** existing static Render mirror, **(3)** Counterparty Core asset description, **(4)** TokenScan basic asset description.
- Only asset IDs with already-reviewed local metadata files can be checked; unknown assets return 404 and invalid names 400. Never construct a URL from a user-controlled hostname.
- Each HTTPS query uses a pinned source, 4.5-second timeout, redirects disabled, JSON MIME check, bounded 16 KiB body, and a 90-second cache/single-flight per approved asset. Responses omit all remote prose, secrets and financial claims.
- `explorer_additional_information_verified:false`, `safe_to_issue:false`, `price:null` are intentional and are never inferred from a matching TokenScan basic description.
- **A valid JSON response from the mirror is not proof the canonical hostname works**. A matching on-chain description is not proof TokenScan parsed the off-chain JSON. All stages are separately labeled.

## Canonical domain repair — path-aware and approval gated (NOT performed here)

**Do NOT blindly redirect the whole `crown.holytemples.org` hostname to the static Render site.** The hostname is also the configured origin of Crown authorization/enrollment and several public asset routes. The static card host cannot handle those trust POST operations. A hasty cutover could turn a metadata problem into an authentication outage.

1. **Verify what actually serves the current Crown hostname.** Identify the active WordPress/GCP/Cloud Run or other origin at DNS A `34.172.66.0`; inspect the hostname's custom domain binding, TLS and routing. Inventory live `/api/v1/trust/{challenge,token,verify}`, `/assets/NOMNI/explore.html`, investment-card and other dependent paths. Check the actual customer-facing behavior; source-code references alone are not evidence of deployed availability.
2. **Preferred lowest-risk fix:** on the *existing verified canonical host*, add a narrowly scoped GET-only exact route for `/assets/NOMNI/tokenscan.json` that serves the already reviewed NOMNI JSON with direct 200, `application/json`, no redirects and no authentication. Preserve every existing route and its security policy. For future assets, add a strict allowlisted asset JSON file handler. Stage and test before any production-facing edit.
3. **Alternative (only if existing hosting cannot be safely extended):** select a path-aware ingress that can serve the static approved metadata **and preserve every existing auth, enrollment and explorer route**. Verify permitted upstreams, WAF/cache policies, TLS, costs, and rollback. A Render custom domain to a static-only service is *not sufficient*. Any DNS migration needs a separate service-by-service regression test and explicit authorization.
4. Record the original `crown` DNS record, host mapping and certificate details. Keep WordPress.com root/WWW/MX/TXT and unrelated hosts untouched. Render's custom domain allowance may incur additional monthly charges depending on workspace usage; no service/spending change without approval.
5. From an external network, confirm direct GET `https://crown.holytemples.org/assets/NOMNI/tokenscan.json` returns 200 with exactly the approved JSON, no 301/302, and accepts no write methods. Verify essential Crown trust API responses and asset explorer links still work; never expose real auth tokens in diagnostics.
6. Confirm the **TokenScan enhanced-information display** itself rather than only matching the `/api/asset/NOMNI` pointer. If TokenScan does not retry, investigate with the indexer. Any description-only on-chain update needs the current authorized controller's explicit approval, signing and separate fee review; never issue more supply to fix metadata.
7. On regression, roll back only the affected route/ingress/DNS to the previously verified configuration and repeat the auth, asset and metadata smoke checks.

## Subsequent automation acceptance

NCC-013 code has an approved-intent staging workflow and independent six-confirmation Counterparty checks. However, the real user signer, GitHub review authenticity/branch protections, static Render deploy hook, and fully authenticated end-to-end token test are **not established**. A future token must not be signed until its exact enhanced JSON is live at its canonical URL and all approval gates pass. The readiness dashboard is an operator tool only and never authorizes signing.

## CLI / smoke

```bash
npm run crown:metadata:test
# After deploying to existing Crown runtime:
curl --fail --silent --show-error https://neo-crown-cardmaster-runtime.onrender.com/metadata/
curl --fail --silent --show-error 'https://neo-crown-cardmaster-runtime.onrender.com/api/crown/metadata-readiness?asset=NOMNI'
```

A healthy monitoring endpoint may legitimately report `canonical_blocked` while the canonical domain remains unmapped. **HTTP 200 from the monitoring endpoint only proves diagnostics are operating.**

### Refs
- https://render.com/docs/custom-domains
- https://render.com/docs/configure-other-dns
- https://github.com/CounterpartyXCP/CIPs/blob/master/cip-archive/cip-0025.md
- https://github.com/Shemsizedek/neo-system/issues/1234
- https://github.com/Shemsizedek/neo-system/issues/1235

**Decision NCC-014-D1:** Preserve the existing Live Crown services, do not change DNS or spending without explicit permission, and expose exact readiness states immediately.
