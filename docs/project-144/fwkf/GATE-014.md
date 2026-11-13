# PROJECT 144 / FWKF Gate 014 — WorldCafe custom domain active

**Date:** 2026-11-01  
**Status:** CUSTOM DOMAIN + WORLD TEMPLE CITY LINK **LIVE AND VERIFIED**

## Verified deployment
- Production preview URL: **https://worldcafe.holytemples.org/** (HTTPS, independent live fetch status 200).
- Page title: **Free World Knowledge Foundation — Turning Knowledge Into Freedom**.
- Public preview remains **noindex,nofollow**, contact submissions disabled; financial/fund/grant/token programs not offered.
- This is the **source-derived self-contained HTML/CSS Foundation edition**, **not** the byte-identical restored historical React ZIP.
- Render remains the preview's origin at `https://fwkf-worldcafe-staging.onrender.com/`; the dedicated Neon `worldcafe` Function proxies GET/HEAD requests to that fixed origin. This stack **does not depend on Penguin**.
- Neon project `purple-waterfall-10955254`, branch `br-young-brook-b8quup3r` (`neo-twlf-forum`) has dedicated function `worldcafe` with a completed deployment.
- Neon domain entry `worldcafe.holytemples.org`: `status=active`, `dns_status=ok`, `binding_status=present`.
- Twenty-one previously active Neon domain bindings were preserved.

## DNS change
- Domain: `holytemples.org`; DNS zone managed by WordPress.com, verified permitted.
- Created **only one** DNS record: `worldcafe` `CNAME` `fn-custom-domains.us-east-1.aws.neon.tech`, TTL 300.
- Readback verified exact record and Neon active status; WordPress returned `success:true`.
- No root DNS, mail records, existing custom-domain mappings, or other records were removed.

## World Temple City navigation
- Published WordPress page ID **3040**: `https://holytemples.org/world-temple-city/`.
- Edited only the existing "☕ World Cafe" heading inside its sole top-level Gutenberg group, wrapping heading text in `<a href="https://worldcafe.holytemples.org/">`.
- Used page-sections optimistic locking; write reported no content warnings.
- Readback verified exactly one updated heading anchor and published status.
- Independent live crawl: World Temple City HTTP 200, link to WorldCafe present; WorldCafe HTTPS HTTP 200 with correct Foundation title/content.

## Next milestone (not part of this gate)
1. Restore full 34-file historical React build and 27 original images if exact design parity is required, without Penguin dependency.
2. Audit public content/legal status/partnership/financial claims before removing noindex.
3. Establish privacy-reviewed contact backend and abuse controls before accepting submissions.
4. Commit source-of-truth for Neon proxy function; retain rollback procedure and monitoring.
5. Preserve original recovery archive privately, separate from public build.

**Rollback:** To back out new domain activation without disturbing existing domains, remove only the new `worldcafe` CNAME after verifying its ID and unbind only the matching Neon custom-domain record; restore page 3040 heading to unlink only if required. Keep all 21 other domains unchanged. Do not run rollback unless authorized.
