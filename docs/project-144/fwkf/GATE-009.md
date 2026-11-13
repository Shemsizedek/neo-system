# Project 144 — FWKF Gate 009: reviewed release preflight

**Status:** SOURCE RELEASE VERIFIED, RENDER PLACEHOLDER STILL LIVE, USER-DOMAIN ACTIVATION BLOCKED.
**Date:** 2026-11-01  
**Target:** `worldcafe.holytemples.org` is intended for the **Free World Knowledge Foundation website**, not a café-only site.

## Current release evidence (reviewed ZIP in ChatGPT conversation)

- File: `FWKF_WorldCafe_Reviewed_Staging_Bundle.zip`.
- SHA-256: `c8644b8d9c1dba6ba90ff6c027953c5e99440844a9b8e20b36e2707fba98c086`.
- ZIP integrity: PASS; 34 files, including 27 original section/shell PNG assets (PNG headers validated).
- 5 HTML-referenced local assets are present and accounted for.
- HTML page title and social metadata identify the Free World Knowledge Foundation.
- `noindex,nofollow`, `robots.txt Disallow: /`, inactive contact-form guard, and deliberate unconfigured API origin verified in release source.
- Compiled JS and form-guard script pass `node --check`.
- Full browser rendering visual QA from the ChatGPT sandbox was blocked by administrator network restrictions; it is **not certified**.

## Connected services readback

- Render dedicated site `fwkf-worldcafe-staging` still points to `apps/fwkf-worldcafe/public` on branch `workstreams/fwkf-worldcafe-hosting-006`. Auto-deploy OFF.
- Last confirmed staging website returns HTTP 200, but displays the **temporary shell**, not the recovered React build.
- WordPress.com authoritative DNS for `holytemples.org` contains **no `worldcafe` record**.
- The connected `penguin` Linux host has empty private folder `/home/neo/fwkgate/`, except for a release-preparation script created here. The reviewed ZIP has **not been transferred**.
- Desktop private helper `/home/neo/fwkgate/prepare-release.sh` was created and syntax-checked. A controlled run without the ZIP exited with expected code 2 and made no deployment changes.

## File handoff instruction

On the user's connected Chromebook/ChromeOS Files app, download the reviewed ZIP from this ChatGPT conversation, then move it to **Linux files → fwkgate**. It should appear as:

`/home/neo/fwkgate/FWKF_WorldCafe_Reviewed_Staging_Bundle.zip`

After observing the file and checking its digest, the assistant can run:

`bash /home/neo/fwkgate/prepare-release.sh`

This generates a staged **local worktree only**, no push, deployment, DNS, monetary spend, or link mutation. Review the resulting changes; commit/push only the 34 public release files in a safe branch. Trigger Render redeploy and run `node scripts/verify_fwkf_deployment.mjs https://fwkf-worldcafe-staging.onrender.com` once code is published.

## Final domain activation gate

Render custom-domain attachment must precede DNS changes. Current Render plugin lacks custom-domain mutation; use a verified Render dashboard operation with available domain quota and record exact DNS target (do not guess CNAME). Once live HTTPS and static asset checks pass, WordPress DNS gets only new `worldcafe` CNAME; then add the published World Temple City page (ID 3040) link. Keep original site data and domain untouched until verified.

**No full website deployment, DNS switch, financial issuance, contact backend enablement, or World Temple City navigation update occurred in this gate.**
