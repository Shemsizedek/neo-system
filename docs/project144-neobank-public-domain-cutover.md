# Project 144 — NEO Bank public-domain cutover

Status (2026-11-02 UTC): **BLOCKED ON RENDER DOMAIN CAPACITY / COST APPROVAL**.
No production DNS was modified. No account banking was activated.

## Verified source of truth
- Intended public hostname: `neobank.holytemples.org`
- Target: NEO SYSTEM Render workspace `tea-dbhtkc8473hc73933img`, web service `srv-dbifhkcs728c73f4iuk0`, origin `https://neo-bank-render-staging.onrender.com`.
- Render dashboard verified live staging application: 6-section interactive *read-only* finance UI, `/healthz` HTTP 200; account services `/api/v1/community/status` return 503 until actual account DB and authorizations are connected.
- GitHub source branch: `feat/neo-bank-ces-staging-gate-20261029`. The Render app is a staging-preview service, **not** operational banking.
- WordPress.com is the authoritative DNS provider for `holytemples.org` (`has_wpcom_nameservers:true`, active domain, DNSSEC enabled).
- Existing sole `neobank` record on WordPress.com: **A `8.232.127.249`, TTL 3600**. This is the exact rollback value.
- Independent external TLS handshake against that A record failed before site content could be verified.
- Authorized GitHub Action `.github/workflows/neo-bank-render-domain-readiness.yml` queried the connected Render API with pre-existing GitHub secret, exposing no credential.
- Render returned `neobank.holytemples.org` **not registered** on NEO Bank service. NEO SYSTEM workspace currently has **2** registered domains: `leaders.holytemples.org` and `city.holytemples.org`.
- Render's current published allowances: Hobby 2 included custom domains, Pro 15, Scale 25; additional registration is **$0.25 per month** each. The workspace billing plan was **not** verified. Do not incur new spend without explicit approval.

## Cutover gate — once domain capacity or potential charge is approved
1. Reconfirm live staging Render deploy, workspace and health. Keep transactional endpoints blocked. Check current Render-domain registration through authorized GitHub API workflow.
2. **First register** `neobank.holytemples.org` on the verified NEO Bank Render service with the official API `POST /v1/services/srv-dbifhkcs728c73f4iuk0/custom-domains`, or through Render service Settings > Custom Domains. This action may cause a monthly charge; gate on explicit approval.
3. Verify Render returns the exact domain under the intended service. Do **not** attach to CES service or another workspace.
4. Only after step 3, make one atomic WordPress.com DNS change: remove **A neobank = 8.232.127.249**, add **CNAME neobank = neo-bank-render-staging.onrender.com**, TTL 300 (or closest provider-allowed TTL). Never alter other records or DNSSEC.
5. Verify public authoritative CNAME points to Render and Render dashboard/API reports the custom domain verified and TLS certificate issued.
6. Over HTTPS request `/preview.css`, `/preview.js`, `/healthz`, `/api/v1/community/status` and the homepage on `https://neobank.holytemples.org`. Confirm navigation and mobile layout. Expected statuses: homepage/assets/healthz 200, account-service status 503 until actual backend connected; no form submission/financial transfers.
7. Monitor behavior and retain old A record for rollback only. **Rollback** only if cutover fails: remove the new `neobank` CNAME, restore the original A `8.232.127.249` TTL 3600 in one WordPress DNS operation. Note that rollback restores the former origin even if its TLS issue remains unresolved. Re-test after rollback.

## Boundaries
- Never claim a live/regulated bank or configured deposits, payments, transfers, issuance, or member account balances from a staging preview.
- Never route private CES cookies, tokens or account lists to the browser.
- No changes to the apex domain `holytemples.org`, other NEO services or their DNS.
- Public-facing preview shows staging/read-only labels on purpose. Production product readiness and account authorization are separate gates.

## References
- https://render.com/docs/custom-domains
- https://render.com/docs/configure-other-dns
- https://api-docs.render.com/reference/create-custom-domain

## Approved domain registration attempt — November 1 local / November 2 UTC

The user explicitly approved a potential $0.25 per month custom-domain charge. An authorized GitHub Actions workflow `.github/workflows/bind-neobank-render-domain.yml` executed with the existing protected `RENDER_API_KEY` secret, after independently verifying target service `srv-dbifhkcs728c73f4iuk0`, exact NEO SYSTEM owner `tea-dbhtkc8473hc73933img`, and lack of an existing `neobank.holytemples.org` registration on the target.

**Result: blocked by Render billing configuration, not permission or DNS.** The Render custom-domain create endpoint returned HTTP 400: `a payment method is required to add more than 2 custom domains`. Workflow run `41383836895`, job `125080212366`; the first attempt was run `41383759450`. No domain was registered or billed on either attempt, and WordPress DNS was not changed. The NEO SYSTEM workspace already has `leaders.holytemples.org` and `city.holytemples.org` registered, consuming Hobby's two included slots.

**Required user-side prerequisite:** In Render Dashboard select the **NEO SYSTEM** workspace, then **Billing > Update payment method**. A payment method must be entered through Render's secure billing interface, **never** in chat, GitHub or environment variables. Do not upgrade workspace plan just to add a domain.

**Resume checklist:** Verify Render now accepts the hostname registration by rerunning the existing exact-target workflow; only after a successful registration switch *only* the `neobank` WordPress A record to CNAME `neo-bank-render-staging.onrender.com`. Validate TLS and public page before marking success. Preserve rollback A `8.232.127.249`, TTL 3600. Do not attempt to bypass billing by changing an unrelated NEO domain or workspace.

**Public banking scope:** The dashboard at `https://neo-bank-render-staging.onrender.com/` is a six-section interactive read-only preview; no live bank account services have been activated.

## Neon fallback requested — November 1, 2026 local (November 2 UTC)

**User request:** Use connected Neon instead of adding a Render payment method to connect NEO Bank for now.

**Verified Neon source:** Neon project `neo-bank-staging`, project id `sweet-dawn-99167630`, default branch `br-cold-frost-akdzmiga` (`main`), region `aws-us-west-2`, project plan `free_v3`. The five existing Postgres tables (`neo_bank_accounts`, `neo_bank_entries`, `neo_bank_idempotency`, `neo_bank_offers`, `neo_ces_source_imports`) were inspected via a read-only `SELECT count(*)` each; **all five contain zero records** as of this check. No account authorization, ledger balance, financial import or production bank readiness follows from the existing schema.

**Hard infrastructure limits confirmed by Neon API:** Neon Functions `list_functions` returned `Neon Functions are not available for this project: it is in aws-us-west-2`; `list_functions_custom_domains` returned `custom domains not available for this project`. Per official Neon [Functions overview](https://neon.com/docs/compute/functions/overview) and [custom-domain documentation](https://neon.com/docs/compute/functions/custom-domains), **Neon Functions do not support hosting websites**; their domains target a deployed backend Function. Neon Function availability is limited to `aws-us-east-1`, `aws-us-east-2`, `aws-eu-central-1`, `aws-ap-southeast-1` for now. Neon cannot replace the HTML/CSS/JS frontend hosting for `neobank.holytemples.org` just by registering a domain.

**Recommended no-extra-Render-billing architecture:**
- Serve responsive NEO Bank frontend on a genuine website host already under user control, preferably the existing WordPress web estate once site routing/subdomain mapping is verified, or an existing dedicated static frontend host with support for an owned subdomain. The working Render `onrender.com` staging preview remains available, but the Render custom-domain binding is currently blocked by a required payment method.
- Keep `neo-bank-staging` as the **Neon Postgres** source for future verified member account data, ledger and CES integration. Use a trusted server-side API with proper identity, audit, account authorization and financial compliance; never connect public browser components directly to privileged Postgres or expose credentials.
- Do not migrate empty tables as real records or show zero records as zero balances. No banking writes or app-account mapping until the source/controller has been verified.

**Action completed:** Neon project and schema inspected read-only; deployment design updated. **Not performed:** No Neon Function/proxy, new project, custom domain, new spending, DNS record edits, bank database mutations, login configuration changes or banking account-link attestations. Existing `neobank` A `8.232.127.249`, TTL 3600 remains the rollback/reference record.

**Next verifiable hosting gate:** Confirm the alternate frontend hostname can be bound to a legitimate website host and can serve the six-section dashboard with valid TLS; only then replace exactly the `neobank` DNS record and verify public HTML/CSS/JS, CSP, TLS and app health. Do not point the domain to a Neon Function or to an unbound Render service simply to avoid Render billing.
