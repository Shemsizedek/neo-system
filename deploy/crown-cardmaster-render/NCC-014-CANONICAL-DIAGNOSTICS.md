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
- The existing Crown Render **web** service ID `srv-dbdf9chsrm7s73bi3ptg` serves the same JSON from branch `feat/ncc-007-render-runtime-hardening`. Keep this Free web runtime for the gallery/Artwork Studio; prefer the static service for canonical asset metadata because the Free web instance can spin down.
- TokenScan's NOMNI profile recently displayed **No additional information is available at this time**. Its `/api/asset/NOMNI` returns a basic on-chain description pointer and **cannot on its own prove enhanced-information ingestion**.

## NCC-014 implemented status endpoints

- `GET https://neo-crown-cardmaster-runtime.onrender.com/metadata/` — responsive, read-only four-source diagnostic dashboard, no wallet or DNS actions.
- `GET https://neo-crown-cardmaster-runtime.onrender.com/api/crown/metadata-readiness?asset=NOMNI` — bounded source readback of **(1)** canonical `crown.holytemples.org`, **(2)** existing static Render mirror, **(3)** Counterparty Core asset description, **(4)** TokenScan basic asset description.
- Only asset IDs with already-reviewed local metadata files can be checked; unknown assets return 404 and invalid names 400. Never construct a URL from a user-controlled hostname.
- Each HTTPS query uses a pinned source, 4.5-second timeout, redirects disabled, JSON MIME check, bounded 16 KiB body, and a 90-second cache/single-flight per approved asset. Responses omit all remote prose, secrets and financial claims.
- `explorer_additional_information_verified:false`, `safe_to_issue:false`, `price:null` are intentional and are never inferred from a matching TokenScan basic description.
- **A valid JSON response from the mirror is not proof the canonical hostname works**. A matching on-chain description is not proof TokenScan parsed the off-chain JSON. All stages are separately labeled.

## Canonical domain activation — approval gate (NOT performed here)

1. **Discover and protect current use of `crown.holytemples.org`.** Check WordPress.com domain mapping, currently served pages and API paths, the original `crown` A-record, and whether any existing Crown integrations depend on this host. Back up DNS, SSL/routing and a rollback plan.
2. **Review Render account allowance / charge risk.** Render Hobby includes two custom domains; extra domains can incur per-month charges. Do not add a billable custom domain or another service without approval. This connector does not expose a safe add-custom-domain action.
3. **Attach domain at Render first.** In the existing Crown static service Settings > Custom Domains add `crown.holytemples.org`; verify Render accepts it and shows the correct DNS target. Do not add the apex `holytemples.org` or a wildcard.
4. **Only after explicit DNS and hostname migration approval**, in the WordPress.com-managed `holytemples.org` DNS zone change only `crown` from the observed A `34.172.66.0` to Render's confirmed CNAME target, expected `neo-crown-cardmaster-staging.onrender.com`. The target must be confirmed from Render settings, not blindly assumed. Preserve WordPress apex, WWW, MX/TXT, DKIM and all other hostnames. CNAME and A cannot coexist at the same name.
5. Verify public DNS propagation, Render custom-domain status and TLS certificate. Require a public, direct HTTP 200 at **exact** `https://crown.holytemples.org/assets/NOMNI/tokenscan.json` with JSON MIME, the approved bytes/fields, no redirects or login gate. Test other Crown URLs for regressions.
6. Read `https://tokenscan.io/asset/NOMNI` independently to determine whether its **additional-information area**, not merely its `/api/asset/NOMNI`, actually populates. Do not state that TokenScan is fixed until observed. If still missing, contact the indexer or consider a separately approved description-only transaction from the **current authorized controller**; no additional supply and no automatic on-chain action.
7. On regression, roll back only `crown` DNS to its previous verified record and recheck TLS/services. Preserve the working Render `onrender.com` mirror either way.

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
