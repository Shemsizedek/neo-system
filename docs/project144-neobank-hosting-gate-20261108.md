# Project 144: NEO Bank hosting migration gate — 2026-11-08

## Verified scope and target
- Required public hostname: `neobank.holytemples.org`.
- Canonical public preview UI: `apps/neo-bank-pages/` in `Shemsizedek/neo-system`, presently deployed at <https://shemsizedek.github.io/neo-system/neobank/> (confirmed HTTP 200 after cutover rollback).
- Separate Render read-only preview: <https://neo-bank-render-staging.onrender.com/>. Adding the third custom domain to the existing Render workspace was rejected pending a configured payment method; no Render charge or plan upgrade was authorized or performed.
- Existing Neon project `neo-bank-staging`, id `sweet-dawn-99167630`, Oregon `aws-us-west-2`, main branch `br-cold-frost-akdzmiga`, is reachable. Public banking tables: `neo_bank_accounts`, `neo_bank_entries`, `neo_bank_idempotency`, `neo_bank_offers`, `neo_ces_source_imports`. Do not disclose database credentials. Neon Functions are unavailable in Oregon; Neon explicitly says Functions are not web hosting. No database writes or account enablement were made.

## No-new-spend Cloudflare trial and why it was not published

Using existing GitHub Actions Cloudflare secrets (never printed), authenticated Cloudflare Pages API access was confirmed. A purpose-scoped static NEO Bank Cloudflare Pages project `neo-bank-project144` was created. The `ops/neo-bank-cloudflare-pages-20261108` source branch contains read-only readiness, deployment, access diagnostics, domain binding and certificate checks.

- GitHub Actions run `42462672598` passed source test, created the Pages project, and Wrangler uploaded 4 public files plus headers successfully. Its final external verification step failed because Cloudflare returned a login page rather than the site.
- Cloudflare Access control check `42463033588`: the project default `neo-bank-project144.pages.dev` responds with HTTP 302 to Cloudflare Access sign-in. The connected account's Access Apps list returned zero apps. This is **not evidence of a public site**; no global or unknown Access rules were modified.
- Domain registration run `42463095011`: `neobank.holytemples.org` successfully registered with the exact Cloudflare Pages project; initial state initializing/pending.
- A one-record WordPress.com DNS change removed `neobank` A `8.232.127.249` TTL 3600 and created `neobank` CNAME `neo-bank-project144.pages.dev` TTL 300. DNS publicly resolved to Cloudflare.
- TLS readiness run `42463414392`: Cloudflare domain status became `active`, certificate validation `active`, DNS verification `active`. However, HTTPS `https://neobank.holytemples.org/` and `/site-status.json` returned a **Cloudflare Access sign-in page**, not the NEO Bank site. The application was not marked operational.
- **Rollback completed and verified**: removed `neobank` CNAME and restored original `neobank` A `8.232.127.249` TTL 3600, affecting no other DNS record. WordPress.com DNS read confirmed the exact old record restored. The old endpoint had pre-existing TLS problems; rollback preserves routing but does not repair that problem.
- The Cloudflare Pages project and its domain registration remain in Cloudflare; this trial did **not** delete them or alter account-wide Access policies, and must not be assumed live. Avoid switching back to Cloudflare until Access can be fixed for exactly this public static site with provider-authorized controls.

## Working paths and next gate
1. Keep **Neon Postgres as the backend data foundation**; do not expose it directly to browsers or enable financial operations until controlled account verification and a secure API exist.
2. Choose a **public-facing frontend host** with a verified standalone hostname and valid TLS. A dedicated GitHub Pages repository under the authorized owner would be a no-new-hosting-fee path, but `Shemsizedek/neo-bank-site` remains absent and connected GitHub does not expose repository creation. The known shared `neo-system` Pages site cannot safely assign the bank's hostname without impacting unrelated routes.
3. Alternatively connect a supported deployment provider such as **Vercel** and inspect the available workspace/plan before creating or charging. Vercel's Hobby plan forbids commercial use; any required paid business plan needs separate spending approval.
4. Register the hostname to the chosen verified frontend service FIRST, then atomically replace only the existing `neobank` A DNS record and test HTTPS homepage, JS, CSS, status JSON, mobile navigation, and no Cloudflare Access/other login gate. Keep old record/TTL rollback available.

No transfers, issuance, bank customer data imports, credentials changes, paid subscriptions, or live account operations occurred in this gate.
