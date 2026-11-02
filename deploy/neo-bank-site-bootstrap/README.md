# NEO Bank: standalone GitHub Pages deployment

## Current source of truth (verified November 2, 2026)

- Working staging: https://neo-bank-render-staging.onrender.com/
- Working public, read-only dashboard: https://shemsizedek.github.io/neo-system/neobank/
- Source-controlled frontend: `apps/neo-bank-pages/index.html`, `preview.css`, `preview.js`, `site-status.json`, `preview.test.mjs`.
- The existing shared `neo-system` GitHub Pages site contains many NEO routes. Do **not** assign `neobank.holytemples.org` to that shared Pages site: it would change the origin for unrelated NEO routes.
- Connected GitHub repo `Shemsizedek/neo-bank-site` was verified **not found** (404) as of November 2, 2026. GitHub connector does not provide a supported create-repository operation. It must be created by the owner at https://github.com/new with owner `Shemsizedek`, name `neo-bank-site`, visibility **Public**, initial `main` README.
- Never insert CES credentials, Neon connection strings, banking records or private keys into a public repository.

## After dedicated repository is available

1. Verify that `Shemsizedek/neo-bank-site` exists, is public, and can be written to.
2. Copy the **five** frontend source files from `Shemsizedek/neo-system` `apps/neo-bank-pages/` into the dedicated repository root as `index.html`, `preview.css`, `preview.js`, `site-status.json`, `preview.test.mjs`. Use the connected GitHub connector; don't manually re-author or guess any bytes.
3. Copy `deploy/neo-bank-site-bootstrap/pages.yml` into the new repository at `.github/workflows/pages.yml`.
4. Enable GitHub Pages in the repository Settings > Pages with **GitHub Actions** as the source. The workflow must pass source tests, assemble a restricted artifact, and deploy to `https://shemsizedek.github.io/neo-bank-site/`.
5. Independently verify the default URL, `/preview.css`, `/preview.js`, `/site-status.json` return 200. Verify mobile navigation and no banking write forms. The JSON must report `accountServices:false`, `financialWrites:false`, `database:not_attached` until protected bank access is genuinely connected.

## Domain binding and rollback (separate gate)

1. Set GitHub Pages **Custom domain** in the new dedicated repository only to `neobank.holytemples.org`. Review any conflict/domain-takeover warnings. Check existing Pages site domains and the optional DNS verification settings. Add a `CNAME` file containing exactly `neobank.holytemples.org` to the new repository only after the Pages custom domain has been verified. Never create it in the shared `neo-system` Pages root.
2. Take a fresh read-only snapshot of the WordPress.com DNS zone for `holytemples.org`. As previously verified, old `neobank` A record: `8.232.127.249`, TTL `3600`, WordPress.com DNS record ID `user_record:neobank:A:93184f82ff7280d3fd1011c76adc3443`. Reconfirm its value before mutation.
3. After the new GitHub Pages owner is correct and default site works, remove just the old `neobank` A record and add a `neobank` CNAME to `shemsizedek.github.io` using WordPress.com DNS. Never change apex, wildcard, or other NEO domains.
4. Confirm authoritative DNS CNAME and GitHub Pages reports the domain verified. Request `https://neobank.holytemples.org/` with valid TLS; verify homepage CSS, JS, and health JSON all load from this hostname. Only then mark the public cutover completed. HTTPS enforcement may need to become available after DNS propagates.
5. On failure, restore the original single `neobank` A `8.232.127.249`, TTL `3600` using WordPress.com. This is only a route rollback; the previous destination already had TLS issues and should not be described as healthy.

## NEO Bank operational boundary

Neon project `neo-bank-staging` remains the planned Postgres data layer. Its five bank-related tables were verified empty. The Oregon project cannot host Neon Functions, and Neon Functions are not a replacement for website hosting. CES member/admin checks being successful do not prove `NMNIBANK` controller authority. No financial transactions, deposits, transfers, issuance, balances, account linking or real-money services are enabled by publishing this UI.
