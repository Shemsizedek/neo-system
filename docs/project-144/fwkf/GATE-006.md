# FWKF Gate 006 — Hosting environment and site-release boundary

**Destination:** `worldcafe.holytemples.org`  
**Organization represented:** Free World Knowledge Foundation (not a café-only site)  
**Source release:** `FWKF_WorldCafe_Static_Release_Candidate.zip` (34 files in previously verified archive)  
**Static-site hosting target:** Render, on a dedicated service  
**Policy:** No spending approvals, financial transactions, contact submissions, KNOWINDEX writes, or production claims.

## Deployment state

The interim `apps/fwkf-worldcafe/public/index.html` is a **noindex staging shell** for infrastructure provisioning. It is **not** the recovered React application and must never be represented as a completed website migration.

The actual 34-file release ZIP is kept outside the public GitHub repo pending an approved binary-file transfer. The release contains HTML, compiled JS/CSS, 27 restored PNGs, favicon/icons, robots.txt and a disabled-form guard. Its original index title still refers to the historical Freedom Knowledge Institute and must be edited to Free World Knowledge Foundation before release.

## Required production sequence

1. Obtain controlled access to the original public-release ZIP in the authenticated deployment environment (no private collaboration source/backups/logs).
2. Materialize the 34 release files into `apps/fwkf-worldcafe/public/` in a reviewed branch, keeping source provenance and file hashes; or build the React source cleanly if dependencies can be verified.
3. Preserve the 27 original visual assets, compare rendered pages and fix title/OG metadata for FWKF.
4. Keep contact forms and services disabled until a reviewed HTTPS backend with access controls, abuse prevention, retention notice and consent.
5. Review claims about scholarships, grants, legal entity status, tokens, funds and investments; remove or label unverified claims in public content.
6. Verify the Render static site responds with 200 on `*.onrender.com`, with linked CSS/JS/images and SPA fallback as needed.
7. Add `worldcafe.holytemples.org` as a **custom domain in Render's Settings first**. Record exact CNAME target and any required TXT verification. Do not guess records.
8. Configure `worldcafe` CNAME in authoritative WordPress.com DNS and verify TLS, homepage and assets. Do not add domains above plan quota without cost approval.
9. Only after successful HTTPS checks, update the published World Temple City page (ID 3040) World Cafe card to link to the new host.
10. Record rollback: remove/restore only new `worldcafe` DNS and revert the page link if health checks fail. Do not change root or unrelated DNS records.

**Ownership & DNS evidence:** `holytemples.org` is active, managed at WordPress.com with WordPress.com nameservers and current-user DNS privileges. Earlier DNS audit found no `worldcafe` record.  
**Funding caution:** Render documents static hosting as free within monthly pipeline/bandwidth allowances; custom domains above workspace quota can incur $0.25/month. No new paid plan or extra domain quota may be assumed.
