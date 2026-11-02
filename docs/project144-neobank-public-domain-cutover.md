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
