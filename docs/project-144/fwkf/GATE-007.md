# Project 144 — FWKF WorldCafe Gate 007: actual archive handoff

**Date:** 2026-11-01  
**Purpose:** Publish the recovered Free World Knowledge Foundation React site at `worldcafe.holytemples.org`, *not* a café business redesign.  
**Status:** STAGING HOST VERIFIED; FULL ARCHIVE TRANSFER AND CUSTOM DOMAIN NOT COMPLETE.

## Verified

1. Render static service `fwkf-worldcafe-staging` exists in NEO SYSTEM workspace, is deployed as `live` and serves `https://fwkf-worldcafe-staging.onrender.com/` with HTTP 200. Its current contents are **only an explicitly labeled temporary staging shell**.
2. Connected WordPress.com confirms `holytemples.org` is an active, current-user-manageable domain with authoritative WordPress.com DNS. The public World Temple City page is ID 3040 and its World Cafe section is not yet linked to the proposed hostname.
3. User-provided `FWKF_WorldCafe_Static_Release_Candidate.zip` passes ZIP integrity; contains 34 files including compiled JS, CSS, HTML, guard, SVGs and 27 recovered PNGs.
4. Prepared a review-only release package `FWKF_WorldCafe_Reviewed_Staging_Bundle.zip` with updated FWKF title/SEO metadata, staging noindex, program-verification disclaimer and guarded contact submissions. Its SHA-256 is `c8644b8d9c1dba6ba90ff6c027953c5e99440844a9b8e20b36e2707fba98c086`.
5. `scripts/import_fwkf_worldcafe_release.py` is committed and its synthetic 34-file import test **passed** on the connected NEO Linux machine, with Python syntax compilation and secure path checks. Actual archive import on that machine has **not** occurred because the ChatGPT attachment is not mounted or retrievable in the connected workstation.

## Blocking transfer boundary

The live Render static service deploys from GitHub. ChatGPT's `/mnt/data` artifact mount is **not** shared with the authorized Linux desktop or GitHub/Render connectors, and the container has no outbound network. The assistant must not pretend that uploading the ZIP to ChatGPT Project Files makes it accessible on the connected build workstation.

The artifact is available for download from the conversation and has been verified in the private container. Transfer the **reviewed staging ZIP only**, not the full 561-file collaboration archive, to the authorized Linux environment. Then run the importer from the feature branch in a clean worktree:

```bash
python3 scripts/import_fwkf_worldcafe_release.py /secure/path/FWKF_WorldCafe_Reviewed_Staging_Bundle.zip --dry-run
python3 scripts/import_fwkf_worldcafe_release.py /secure/path/FWKF_WorldCafe_Reviewed_Staging_Bundle.zip --publish apps/fwkf-worldcafe/public
git add apps/fwkf-worldcafe/public/
git diff --cached --stat
# Review outputs; then commit and push the hosting branch.
```

After the compiled site replaces the shell on GitHub, manually trigger Render deployment because auto-deploy is **off**, and verify the static HTML/JS/CSS/icons and 27 asset images at the onrender.com URL.

## Custom domain and link gate

- Render connector exposes static-site create/deploy status but **does not expose custom-domain attachment**. Before WordPress DNS changes, attach `worldcafe.holytemples.org` in the Render service's Custom Domains settings, obtain the exact provider-issued CNAME target and verification requirements, and confirm no cost/limit changes.
- Then add the **single** `worldcafe` DNS CNAME in the WordPress.com domain controls. Do not touch `@/www` or unrelated records.
- Verify DNS and HTTPS on the requested hostname. Only then update WordPress page ID 3040 World Cafe section to link to the new Foundation site.
- The website's grants, funds, investment/token content, and legal-registration language require owner review prior to indexable public release. Keep staging noindex and no form submissions until cleared.

## Release/rollback boundary

No restored website is claimed live on the requested hostname at this gate. No domain DNS changes or World Temple City link changes. No KNOWINDEX writes or financial operations.
