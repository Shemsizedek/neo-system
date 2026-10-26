# NEO Crown Canonical Metadata Bridge — deployment candidate

**Status: review-only, NOT installed**. Do not install on `holytemples.org` merely because WordPress.com account access exists. Only the verified WordPress installation actually serving the `crown.holytemples.org` HTTP host can use this adapter.

## Purpose

The NOMNI on-chain Counterparty description is `https://crown.holytemples.org/assets/NOMNI/tokenscan.json`. The existing static Render service already hosts a read-only approved JSON file, but the canonical WordPress-managed hostname has not been independently verified to serve it. Unlike a DNS change that sends *all* Crown paths to a static site, this plugin handles only the exact GET/HEAD path:

`/assets/<UPPERCASE_ASSET>/tokenscan.json`

All other WordPress routes and Crown auth routes remain untouched by this plugin's handler, although plugin activation flushes WordPress rewrite rules once and should only occur after a staging verification.

## Behavior

- Fixes remote source to `https://neo-crown-cardmaster-staging.onrender.com`, only a whitelisted asset ID may be appended.
- Requests fixed JSON over HTTPS using `wp_safe_remote_get`, four-second timeout, zero redirect hops, max 8,192 response bytes.
- Validates 200, JSON MIME, exact asset ID, 2,048-character description, optional 100-character HTTPS website/PNG/PGP signature. Unknown fields fail closed.
- Returns direct 200 JSON with 120-second caching, or explicit 404/503, **never** redirecting to Render. Stale or arbitrary fabricated JSON is never substituted after a network failure.
- Serves only on the literal `Host: crown.holytemples.org`. Installing the plugin on the Word Temple apex would not automatically make that apex another metadata origin.
- POST/PUT/PATCH/DELETE are not accepted. No signer, wallet key, database publication, supply change, issuance, fees, provider API credential or third-party image generation.

## Critical verification before any installation

1. **Prove** that `crown.holytemples.org` resolves to a WordPress PHP installation under authorized control, and establish a reversible staging environment. The connected WordPress.com site list currently identifies `holytemples.org` as its accessible Atomic site, NOT an independently verified Crown-host site. If the Crown hostname is served elsewhere, this plugin cannot fix it.
2. Inventory existing `/api/v1/trust/challenge`, `/api/v1/trust/token`, `/api/v1/trust/verify`, `/assets/<ASSET>/explore.html` and `investment-card.json` routes. They are referenced in NEO source. Confirm live behavior with safe unauthenticated checks; never submit valid wallet credentials as probes.
3. Back up plugin state and WordPress rewrite rules, install to the correct **staging** origin only, activate, and confirm routes and existing auth functions still behave as expected.
4. From an unrelated public network, require the **same URL as NOMNI's on-chain description** to return direct HTTPS 200 JSON, no 301/302, with reviewed NOMNI content and content-type. Verify actual TokenScan enhanced-information presentation rather than only its on-chain pointer.
5. Only after rights, identity, system and change approval consider production activation. If any regression occurs, deactivate the plugin and restore previous rewrite rules (no DNS modification is necessary with this option).

## Future issuance integration

NCC-013 will prepare each approved token's `tokenscan.json` on the static Render branch *before* signing, deploy the existing static site when the authorized hook is configured, and require a canonical readback. With this bridge, the same canonical path can serve new allowlisted assets without rewriting PHP for every token. The mainnet signer, authorized deploy hook and review gates are **not connected yet**.

The mirror is the single source of approved JSON; the bridge never accepts unauthenticated public writes.

## Developer tests

```bash
php -l integrations/wordpress/neo-crown-metadata-bridge/neo-crown-metadata-bridge.php
php integrations/wordpress/neo-crown-metadata-bridge/test.php
```

The tests mock WordPress APIs, do not prove live WordPress routing, DNS or TokenScan ingestion. See `deploy/crown-cardmaster-render/NCC-014-CANONICAL-DIAGNOSTICS.md`.
