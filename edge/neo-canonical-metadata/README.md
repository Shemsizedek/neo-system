# NCC-018 — NEO canonical metadata path recovery (staging only)

## Verified evidence, 26 October 2026
- On-chain Counterparty description and TokenScan basic pointer identify the immutable *technical asset code* `NOMNI` at `https://crown.holytemples.org/assets/NOMNI/tokenscan.json`. This is a protocol identity field, not the ecosystem's public brand.
- That **exact canonical hostname/path returned HTTP 404**, including the Crown hostname root in read-only external checks. Hence the NEO canonical metadata publication gate remains **blocked**.
- The reviewed compatible source `https://neo-crown-cardmaster-staging.onrender.com/assets/NOMNI/tokenscan.json` returned HTTP 200 with a minimal approved `asset`, `description`, `website` object. The on-demand NEO Crown gallery and Layer 3 studio remain separate and operational.
- Another connected Render static site, `neo-nomni-metadata` (`srv-dbfjt2qvcj2c738e5pkg`), exists on `main`, with `autoDeploy:yes` and a publish path to `server/crown-metadata/attachments/NOMNI`. Its `/tokenscan.json` returns HTTP 200 **but a different extended payload** containing `name`, `image_title`, `image_large`, `instrument_type`, and `categories`. Those extra fields do **not** satisfy the strict legacy enhanced JSON contract currently enforced by NEO Crown issuance/readiness. Do not route canonical requests there without a separately reviewed schema decision.
- Connected WPVibe administrator access was verified for WordPress `https://holytemples.org`. That is a **different hostname** from `crown.holytemples.org`. It does not establish who controls the Crown subdomain's authoritative DNS or edge proxy. Editing the main WordPress site's PHP or DNS would be unsafe as a substitute.
- No issuer wallet signature, Bitcoin transaction, financial backing, TokenScan enhanced display or new instrument rights have been verified by these checks.

## Prepared route-specific adapter

`edge/neo-canonical-metadata/worker.mjs` is a zero-dependency HTTPS edge handler containing the **exact reviewed staging compatibility metadata**. It is not installed anywhere, and it creates no new Render service.

A **capable authorized edge provider** (Cloudflare Workers, an Nginx reverse proxy with path routing, or an equivalent host-level rule) may bind **only** this URL path:

```
Host: crown.holytemples.org
Path: /assets/NOMNI/tokenscan.json
Methods: GET, HEAD
Response: HTTP 200; application/json; exact approved JSON
No 301 / 302 / 307 redirects; no cache masquerading as authorization
```

If the domain is on Cloudflare and the DNS record is proxied, the **only proposed worker route** is `crown.holytemples.org/assets/NOMNI/tokenscan.json*` with handler-level strict exact-path check. DO NOT route `crown.holytemples.org/*`. The live route and DNS cannot be activated from the connected tools because there is no verified authorized DNS/edge-provider connection in this task.

Other paths, including `/auth/*`, `/api/*`, `/agents/*`, `/.well-known/*`, unrelated assets, WordPress and the Crown root, must keep their existing origin. The worker's pass-through is an additional safeguard but **not** a reason to bind a wildcard route.

Before enabling the new route:
1. Obtain authoritative DNS provider and control for `crown.holytemples.org` from the user's authorized domain account, along with the original upstream Crown auth origin.
2. Verify Crown auth/agent enrollment path health independently. A hostname that already returns 404 at its root needs operator assessment; do not point it at a static site to mask an existing outage.
3. Confirm precise serving rules and install only the specific path route; review any required TLS/certificate and potential provider plan charges **before** changes.
4. Test the canonical endpoint from outside: direct HTTP 200 JSON, expected Content-Type, no redirect, exact deep JSON equality to the reviewed `apps/neoscan/web/cardmaster/assets/NOMNI/tokenscan.json` (not the richer unreviewed attachment).
5. Check `https://neo-crown-cardmaster-runtime.onrender.com/api/crown/metadata-readiness?asset=NOMNI`. Only call it canonical-ready if `canonical.state==='matches_approved'` and Counterparty/TokenScan pointers match. TokenScan's additional-information display still requires a separate page/ingestion check.
6. Re-test the auth, JWT/JWKS, agent enrollment and authorized token issuer endpoints. Revert the single route if any of these differ.
7. Only then consider an approved NCC-017 staging auto-publisher activation. NCC-017C's hourly GitHub scheduler remains a **draft**, not active. Do not auto-issue or alter any token description.

## Testing

```bash
npm run crown:canonical:edge:test
npm test
```

These tests establish the behavior of the adapter **only**, not live hosting, TokenScan ingestion, a DNS cutover, wallet authorization or the availability of the existing Crown identity origin.

## Rollback

Remove precisely the new exact-path edge binding. Re-test other Crown authentication and issuance paths, then the baseline metadata-readiness status. Do not roll back the unrelated static gallery, WordPress root, or the on-chain description.
