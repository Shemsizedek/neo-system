# NEO Bulletin Agent — Gate 2 executable research worker

This is an **agent implementation**, not merely a series plan. Node 24, no third-party packages.

## What runs
1. Determine the current America/Chicago weekday and matching editorial series.
2. Retrieve two trusted source URLs via HTTPS and hash the retrieved bytes (SHA-256).
3. Fail closed on unverified sources, bad status, redirect outside the allowlist, unexpected content type, missing page title, or incomplete evidence.
4. Produce a source-led editorial worksheet with original URLs, timestamps, hashes and explicit findings to be checked by an editor.
5. Write an auditable JSON receipt and HTML draft under `artifacts/bulletin/`.
6. With explicit WordPress application credentials, look up the generated slug and create **only a private draft** on the NEO Bulletin category. No credentials: record the draft as `not_configured`.
7. NEO Marketer distribution is intentionally disabled until a human-approved, independently verified publication receipt exists.

## Commands
```sh
node --test agents/neo-bulletin/worker.test.mjs
node agents/neo-bulletin/worker.mjs
```

## WordPress adapter (opt-in only)
Runtime-only environment variables: `NEO_BULLETIN_WP_USERNAME` and `NEO_BULLETIN_WP_APP_PASSWORD`. Never put credentials in the repository. The scheduled workflow intentionally does not pass these variables. Avoid using a privileged WordPress account; use a least-privileged editor/application password with revoke support. Published posts and scheduled public publication are not implemented.

## Schedule
`.github/workflows/neo-bulletin-agent.yml` performs tests on PRs; a daily 13:15 UTC research run (07:15 CST / 08:15 CDT) runs when merged into the default branch, and an on-demand run is available. Local Chicago weekday detection is independent of runner UTC clock. A separate ChatGPT Editorial Desk automation already prepares editorial briefs; it is not the runtime scheduler of this worker.

## Current limitations
- Source retrieval proves that a page was reachable and gives a reproducible body hash. **It does not verify an interpretation, legal theory, or claim on that page.** Those require independent research and editorial approval.
- Source selection is an allowlisted starting catalog, not open-web autonomous discovery; agent-assisted search and specific textual claim support will be added next.
- Some hosts may block automated requests; such failure blocks the draft and emits an error. Do not fabricate source evidence.
- No auto-publishing, social posting, targeted rebuttal campaigns, legal filings, or financial actions.
- WordPress drafts do not auto-merge or auto-update: a slug collision is treated as idempotently existing and passed to editorial review.
- All original World Bulletin and social-content routing locks stay unchanged.

## Deployment gate
Merge only after CI pass. Verify at least one scheduled or manual workflow receipt and examine URLs, hashes, failures, local weekday, post-state, and absence of social sends. Only then configure least-privilege WordPress draft secrets if desired.
