# HOSTING-001: Render and ChatGPT Sites migration

The owner authorized migration of holytemples.org and NEO sites to Render or ChatGPT Sites, choosing the platform suited to each workload. The Render NEO workspace was explicitly confirmed. This branch stages replacements without changing production DNS or destroying existing infrastructure.

## Placement

- Retain the nine existing Sites projects and their current audiences. Eighteen custom domains are active there. Public HTML, compatible Worker portals, explorer interfaces and read-only catalogs fit Sites.
- Retain fourteen existing Render services and two databases. Use Render for persistent Node/Python processes, backend APIs, workers, databases and WordPress PHP/MariaDB.
- `inventory.json` records those resources and 27 additional source-declared hostnames. It is a source inventory, not a complete authoritative DNS-zone export. Do not treat a discovered hostname as proof of a live service.

## Replacement runtimes

The existing Render `neo-system` service has the invalid start command `Yarn start`. A replacement edge can use this branch with:

```
Build: node --test server/neo-edge/*.test.mjs && node scripts/build-enterprise-pages.mjs && npm install --prefix apps/neo-exchange && npm run --prefix apps/neo-exchange build -- --base=/
Start: node server/neo-edge/production.mjs
NODE_ENV=production
NEO_PLATFORM_API_ORIGIN=https://neo-platform-api-recovery.onrender.com
```

This provides the existing edge runtime; it does not restore external databases, identity authority, AI credentials, financial services or every backend. Keep source services and DNS until each routed workload passes equivalence checks. Runtime health is distinct from dependency readiness.

MSTA preservation uses `node server/msta-legacy-proxy/server.mjs`, with `node --test server/msta-legacy-proxy/server.test.mjs` as its build check. The migration removes visitor-credential forwarding to the public archive, rejects writes and unknown paths, preserves navigation and returns 503 if the archive cannot be reached. It is a public archive service, not a migration of private MSTA records.

## Stateful cutovers

1. **WordPress root:** Duplicator full backup ID 1 completed with `can_proceed=true`, `is_full_backup=true` and no exclusions. Export it via an authenticated private path; a completed source backup is not yet a verified destination restore. Provision WordPress PHP and persistent wp-content plus a private MariaDB service with a persistent disk. Import database and files, preserve existing users/plugin settings and test publishing, forms, checkout, redirects, sitemap, ads.txt and media. Verify restore before switching apex/www. Preserve MX, SPF, DKIM and other mail records.
2. **World Court:** export `/var/lib/neo-world-court/neo-tribunal.sqlite` with a consistent SQLite backup and retain the current encryption, receipt and service-record keys in secret storage. Restore to a Render persistent disk before testing existing case access, audit integrity, intake, e-filing and operator authorization. Do not create a fresh database and call it a migration.
3. **NEO Pass/member services:** retain account identity, issuer/audience validation, signing-key history and session policy. Recover current records and secrets through authorized administrative access. Existing Render recovery code using in-memory stores does not establish durable member-record migration.

## Current access blockers

- Render MCP can create services but cannot change the existing service's start command, configure all disk/database settings or complete custom domains. The Render dashboard opened to sign-in; an authenticated session is required for those controls.
- No Cloudflare DNS integration is saved in SentinelX. WordPress connector exposes domain writes but currently exposes no domain-details/DNS-read operation required to inspect the existing zone. Obtain an authenticated DNS-management surface before any cutover.
- No source VM, Firestore export or WordPress migration archive has been transferred to Render by this branch.

## Verification and rollback

Run `node --test server/msta-legacy-proxy/server.test.mjs server/neo-edge/*.test.mjs`. Before each DNS cutover record current DNS and TTL, target deployment and commit, data-backup hash, restore test, TLS state and application checks. A deploy that returns 200 is not proof that member data or protected workflows work. Preserve source resources and rollback records until the replacement is verified.

This migration adds no automatic Google resource deletion and no primary database or signing-key switch.

## Replacement deployment evidence

- `neo-edge-render`: service `srv-dbd93p5g1s2s73al65v0`, https://neo-edge-render.onrender.com. Initial deploy was live; external verification exposed a 421 on Render's default hostname. The follow-up maps only the configured Render hostname to the existing public NEO gateway, preserving custom-host routing. Local startup returned health 200; 19 targeted tests passed. Follow-up deployment requires external verification.
- `neo-msta-preservation`: service `srv-dbd93s8473hc73ebuqd0`, https://neo-msta-preservation.onrender.com. Initial deploy is live and `/health` returned 200. The original archive returns 403, so the content is not verified and the custom domain must remain uncut.
- Render dashboard authentication was declined. Do not retry browser sign-in unless the owner asks. Connector access remains available for supported operations.
- Full WordPress backup `20261022_worldtemple`, ID 1, completed at the source with no exclusions (reported size 482.2 MB). It has not been downloaded or restored to Render.

The replacement edge is explicitly a migration preview (`NEO_HOSTING_MIGRATION_SHADOW=true`). It blocks writes, API routes and identity/bank/treasury/court/operator hosts, and its health response reports `productionReady=false` and `recordsMigrated=false`. The existing production services remain in place. Twenty targeted tests passed after this restriction was added.
