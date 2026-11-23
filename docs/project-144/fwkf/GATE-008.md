# FWKF Gate 008 — Site activation checkpoint

**State:** SITE HOST READY; FINAL ZIP DEPLOYMENT AND CUSTOM DOMAIN BLOCKED BY FILE TRANSPORT.

## Current verified platform

- Render static site: `fwkf-worldcafe-staging` in NEO SYSTEM workspace
- Render ID: `srv-dbjo5jp42hec73dk7d60`
- Preview: `https://fwkf-worldcafe-staging.onrender.com`
- Repository: `Shemsizedek/neo-system`, branch `workstreams/fwkf-worldcafe-hosting-006`, publish path `apps/fwkf-worldcafe/public`
- Verified current public URL: HTTP 200, **temporary staging HTML only**. This is not the real FWKF React site.
- Actual source release: `FWKF_WorldCafe_Reviewed_Staging_Bundle.zip`, 34 files; kept outside the public source archive.

## What blocks release

The ZIP exists in the current conversation's sandbox, not on the connected desktop. Sandbox network egress and DNS to GitHub are disabled, Google Drive transfer timed out, and the remote desktop lacks a direct mount for ChatGPT file artifacts. Do not mistake a ZIP verified in sandbox for one imported in the hosting branch.

Render's connected plugin can create static sites and trigger deployments, but **does not expose custom-domain attachment**. WordPress.com can update DNS only after the target is registered and exact records/SSL requirements are known. Do not point `worldcafe.holytemples.org` at an unverified temporary shell.

## Minimum deployment handoff (one human file transfer)

Download `FWKF_WorldCafe_Reviewed_Staging_Bundle.zip` from the Project 144 ChatGPT conversation and place it on the connected **penguin** Linux desktop in a private directory, e.g. `/home/neo/fwkgate/FWKF_WorldCafe_Reviewed_Staging_Bundle.zip`. Do **not** commit that ZIP or the original 561-file collaboration archive.

Then, in an isolated worktree of the branch, run:

```bash
python3 scripts/import_fwkf_worldcafe_release.py /home/neo/fwkgate/FWKF_WorldCafe_Reviewed_Staging_Bundle.zip --dry-run
python3 scripts/import_fwkf_worldcafe_release.py /home/neo/fwkgate/FWKF_WorldCafe_Reviewed_Staging_Bundle.zip --publish apps/fwkf-worldcafe/public
git status --short
git add apps/fwkf-worldcafe/public/
git diff --cached --stat
```

Review artifacts and absence of credentials before committing/pushing. Then trigger Render deploy (autoDeploy is off) and execute:

```bash
node scripts/verify_fwkf_deployment.mjs https://fwkf-worldcafe-staging.onrender.com
```

If the verified site is live: attach custom domain **in Render's dashboard first**, verify the domain quota and exact CNAME/TXT, update only `worldcafe` DNS through WordPress.com, check HTTPS at that hostname, then update page 3040 World Temple City with the new link. The WordPress.com-hosted main site and root DNS must not be disturbed.

## Security

Read-only staging, `noindex`, no contact submissions or KNOWINDEX writes, no unverified grants or tokens presented as active entitlements. Domain activation is requested by sponsor but is not evidence that third-party domain attachment or content review has occurred.
