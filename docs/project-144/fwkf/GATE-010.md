# FWKF Gate 010 — Static website certification check

**Date:** 2026-11-01  
**Goal:** publish the *recovered* Free World Knowledge Foundation React site, without converting the World Cafe target into a café-only site.  
**Target hostname:** `worldcafe.holytemples.org`. **Status:** NOT ACTIVE.

## Verified this gate

- ChatGPT attachment ZIP `FWKF_WorldCafe_Reviewed_Staging_Bundle.zip` exists in the current sandbox at 1,020,013 bytes, passes `zipfile.testzip()`, and has SHA-256 `c8644b8d9c1dba6ba90ff6c027953c5e99440844a9b8e20b36e2707fba98c086`.
- ZIP contains 34 files, including site HTML, 230 KB compiled JS, 28 KB CSS, form guard, icons, robots.txt, and 27 archival PNGs.
- Connected machine `penguin` remains online; the isolated `/home/neo/fwkgate` folder still does not contain the ZIP.
- The Render staging domain `fwkf-worldcafe-staging.onrender.com` serves an HTTP 200 **temporary placeholder**, not the recovered compiled site. Do not promote it.
- Added `scripts/verify_fwkf_release_tree.py` and `tests/verify_fwkf_release_tree_test.py`. The **two** synthetic test cases passed on connected `penguin` after fetching the branch.
- Added GitHub Actions workflow `.github/workflows/fwkf-release-gate.yml` that fails closed until the real release files are committed and pass the static release audit and JavaScript syntax tests.

## Explicit blockers

1. **File transfer:** This ChatGPT session's ZIP is not mounted in the connected Linux environment; the previous Google Drive transfer timed out. No unsupported or anonymous download URLs have been invented.
2. **Full build promotion:** No commit containing the real React bundle, stylesheet, all 27 images, and matching release metadata is yet on the Render hosting branch.
3. **Custom domain:** Render does not expose custom-domain attachment through the connected tools. Add domain in Render **before** updating authoritative WordPress DNS, and verify quota, provider-specified DNS target, and TLS.
4. **Final publication:** Grant, token, fund, program and organizational status claims must remain flagged for review; contact form submissions remain inactive. User has authorized staging and domain deployment but not spending or insecure form processing.

## Exact next action

Place the already-reviewed ZIP into the authorized Linux path:
`/home/neo/fwkgate/FWKF_WorldCafe_Reviewed_Staging_Bundle.zip`.

The device-side helper `/home/neo/fwkgate/prepare-release.sh` is already installed, validated and refuses to run with missing bytes or the wrong SHA-256. After receiving the ZIP:

```bash
bash /home/neo/fwkgate/prepare-release.sh
# Review the files. Commit/push only the public 34-file release.
python3 scripts/verify_fwkf_release_tree.py apps/fwkf-worldcafe/public
node scripts/verify_fwkf_deployment.mjs https://fwkf-worldcafe-staging.onrender.com
```

A successful Render smoke test is prerequisite to DNS. The Word Temple City page ID 3040 must be linked only after `https://worldcafe.holytemples.org` has validated its TLS and content.

**Decision:** The project's next action is a *file handoff*, not a new site, new domain purchase, new deployment attempt of the placeholder, or unrelated GitHub expansion. The correct output remains the original FWKF website from the owner-approved reviewed ZIP.
