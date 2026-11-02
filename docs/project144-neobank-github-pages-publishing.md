# Project 144 — NEO Bank Pages publishing gate

Verified on November 2, 2026 (New York local).

## Completed

- Source: `apps/neo-bank-pages/{index.html,preview.css,preview.js,site-status.json,preview.test.mjs}` in `Shemsizedek/neo-system`.
- `pages.yml` now publishes these assets to `dist/neobank/` without changing existing NEO Pages routes.
- Review PR [#1301](https://github.com/Shemsizedek/neo-system/pull/1301) merged into main at commit `7d500df5cd94685fd07ecfe09a8b81f792752c81`.
- Dedicated `NEO Bank Pages Frontend Check` GitHub Actions run `41445042531` passed.
- Existing `Deploy NEO System to GitHub Pages` run `41445125107` completed **successfully**, including the publish step and asset upload.
- Verified live HTTPS URL: <https://shemsizedek.github.io/neo-system/neobank/> HTTP **200**, page title **NEO Bank | Community Finance**.
- Live CSS, JS, and `site-status.json` each returned HTTP **200**.
- Public JSON explicitly reports `mode:read-only-preview`, `accountServices:false`, `database:not_attached`, `financialWrites:false`.
- No balances, private CES data, payment submission forms, or authentication secrets are embedded in the site.

## Custom-domain gate and non-destructive constraint

Current WordPress.com DNS for `neobank.holytemples.org`: A `8.232.127.249`, TTL 3600. This has **not changed**. Render custom-domain binding remains blocked by its requirement for a payment method to exceed two included names. Neon Postgres is connected for NEO Bank, but Neon Functions and Functions custom domains are unsupported for the existing Oregon project; Neon also does not serve websites.

The shared `neo-system` GitHub Pages site hosts many public NEO routes and should **not** be assigned `neobank.holytemples.org` as its global custom domain just to fix the bank. Doing so can change the site's URL semantics for all other routes and would serve the NEO System root rather than NEO Bank at `/`.

A dedicated public GitHub Pages repository for the bank is the clean alternative for a standalone `neobank.holytemples.org` hostname, preserving the NEO System Pages site. An existing dedicated NEO Bank repository was not found through connected GitHub repository search. The current GitHub connector has no supported create-repository or GitHub Pages custom-domain settings tool; those two actions require the GitHub UI or an authorized provisioning interface.

## Next gate (not yet performed)

1. Establish an independent public GitHub Pages repository for `neobank.holytemples.org` under the authorized GitHub owner. Keep `neo-system` as the source-of-truth and mirror versioned, read-only UI assets to the dedicated Pages repository without copying private data.
2. Enable Pages and set the exact custom domain `neobank.holytemples.org` in that repository, *before DNS is pointed to GitHub Pages*; confirm no other repository owns that hostname.
3. After the GitHub Pages domain binding is confirmed, atomically replace **only** the WordPress.com `neobank` A record with a CNAME to `shemsizedek.github.io`, as GitHub documents for project subdomains.
4. Validate domain DNS, HTTPS certificate, root `/` content, linked JS/CSS, mobile navigation, and false financial readiness as above. Keep the original A `8.232.127.249` and TTL 3600 as rollback.
5. In parallel, keep the existing Neon `neo-bank-staging` PostgreSQL tables read-only and empty until authenticated account control, backend APIs, audit and financial compliance are independently verified.

No production DNS cutover, Render upgrade, new paid hosting, banking transactions, Neon writes or new GitHub repository were performed in this gate.
