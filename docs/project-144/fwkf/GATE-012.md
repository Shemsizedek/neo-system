# Project 144 — FWKF Gate 012: Cloud-only public-preview deployment

**Updated:** 2026-11-01
**Target:** `worldcafe.holytemples.org` (not yet connected)
**Current usable preview:** `https://fwkf-worldcafe-staging.onrender.com/`

## Completed

1. User directed that Penguin **must not be required** for using or deploying the website; Penguin is now optional for later asset and source-parity work.
2. Source inspection: recovered Free World Knowledge Foundation React app in `Project_144_FreeWorld_Collab_Pack.zip`. Its recovered sections include About, Founder, Vision, Smart City, World Café, Knowledge Hub, Value Chain, Academy, Index, funds, stewardship, token concepts, research, partnerships and contact.
3. Added a **self-contained, source-derived responsive HTML/CSS public preview** at `apps/fwkf-worldcafe/public/index.html`. This **is not** the original compiled React bundle and does not include the original recovered PNG illustrations. Its design and copy are informed by the recovered website; it is not a byte-identical restoration.
4. Committed commit `27855a0e8fb3ba77ff11d78daad5112d2137f610` on `workstreams/fwkf-worldcafe-hosting-006`.
5. Triggered Render deployment `dep-dbjopkou01pc73840n30`, and Render reported **status live**. An independent live fetch returned the Foundation content on the staging URL.
6. Kept noindex/nofollow, safe preview disclosures, no active forms, no token/fund offerings, no donation collection, no financial workflows.
7. Created `scripts/verify_fwkf_cloud_edition.py` for the independent cloud preview quality gate. The stricter historical React-release validator continues to enforce ZIP parity as a **separate future gate**, not a claim that the preview is the archived build.

## Still open

- **Render custom domain:** The connected Render plugin does not provide a custom-domain creation/management action. Associate `worldcafe.holytemples.org` with the Render service in Render dashboard first. Verify its exact DNS target and any additional charges before modifying DNS. Only then add the WordPress.com authoritative DNS CNAME and verify HTTPS.
- **World Temple City page** (WordPress page ID `3040`): link is intentionally unchanged until the target hostname responds with verified Foundation content.
- **Original React-build parity:** actual reviewed 34-file bundle remains an optional later fidelity upgrade, not a prerequisite for use of the cloud-only Foundation web edition.

## Rollback

Auto-deploy is off. Revert this feature-branch commit and trigger a Render manual deploy. Before any domain action, verify the custom domain and ensure the parent `holytemples.org` domain and unrelated records are unchanged.

**Conclusion:** The website is usable via Render's staging URL without Penguin. The requested custom hostname is **not activated**, and the installed web edition is **not identical** to the original archived React application.
