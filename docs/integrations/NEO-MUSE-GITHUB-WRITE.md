# NEO-MUSE-GITHUB-001 — scoped GitHub write lane

## Goal
Let Meta Muse contribute code to `Shemsizedek/neo-system` without making
Muse an administrator, giving it permanent credentials, or allowing direct
merges. This is **staged repository configuration**, not evidence that the
Meta Muse app has already received GitHub authorization.

## Two distinct integrations
1. **Meta Muse app**: to give the user's interactive Muse experience
   access to GitHub, the owner must install/authorize
   [Meta Muse AI GitHub App](https://github.com/apps/meta-muse-ai) in GitHub,
   choose **Only select repositories**, select `Shemsizedek/neo-system`,
   and review the app's requested rights, especially **Contents: read/write**.
   The account owner completes that consent in GitHub; a file in the repo
   cannot grant a third-party app permission.
2. **NEO-controlled Muse writer**: `.github/workflows/neo-muse-github-pr-write.yml`
   invokes Muse Spark through the Meta Model API and OpenCode from GitHub
   Actions with a short-lived, job-scoped `GITHUB_TOKEN`. Its config is
   `opencode.json`, `AGENTS.md` and
   `.opencode/agent/neo-muse-writer.md`. It is not the personal Muse
   app session and cannot access that session's conversations.

## Activation requirements
- Merge this PR after reviewing the policy and action version.
- Add `MODEL_API_KEY` to **GitHub repository Actions secrets** (never source
  code or publicly visible settings). This is a Meta Model API key.
- Verify repository Actions settings permit GitHub Actions to create PRs;
  enable required checks and protected `main` reviews.
- Prefer a pinned SHA for the third-party OpenCode action before production
  enablement; `@latest` follows Meta's example but is not supply-chain pinned.
- Create an ordinary issue describing a small test code change. The
  `Shemsizedek` account triggers work by commenting `/oc <task>`.
- Verify the workflow run, authored branch, tests, proposed PR and required
  human review. Do not treat a passing API probe as proof of write access.

## Scope and trust boundary
- Allowed: read repo, propose code changes, create commits on a feature
  branch, open a PR, and report verification.
- Prohibited: merge to `main`, production deployment, self-changing
  workflow or policy, credential access/disclosure, NEOpass authorization
  changes, signing, wallet/custody execution, financial operations, and
  unrestricted network access.
- `github.token` is granted only to this explicitly owner-gated job, not
  exposed to a static website. The app's own OAuth/GitHub permissions are
  independent from this workflow's token.
- This code does **not** install the external app, configure its permissions,
  create a Model API key, or prove a live Muse session can write.

## Verification
1. Confirm GitHub app installation separately in Settings → Applications →
   Installed GitHub Apps. For the Meta Muse app, confirm repo selection and
   the exact permissions displayed by GitHub.
2. Confirm the GitHub Actions secret exists and execute the existing
   `NEO Router Muse Live Check` workflow.
3. Trigger this new workflow from a small owner-authored `/oc` issue comment
   only after merge and safety review.
4. Confirm that an ordinary branch and PR were created but `main` was
   untouched and no automatic merge/deploy occurred.

Meta's reference implementation:
https://dev.meta.ai/docs/cookbook/github-agent
