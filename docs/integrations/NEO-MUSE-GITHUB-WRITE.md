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
- OpenCode GitHub Action is pinned to reviewed Git ref
  `77fc88c8ade8e5a620ebbe1197f3a572d29ae91a` (resolved from `latest`
  during Gate 002). Re-review on updates; the action still installs its
  OpenCode runtime dynamically, so version control remains a residual risk.
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
- The Muse agent cannot run npm scripts, build commands or arbitrary shell
  programs while its secret-bearing job is running; repository CI tests run
  independently on the proposed PR. Sensitive control-plane paths are denied
  at the agent tool-policy layer, with CODEOWNERS marking review ownership.
- Branch protection rules and CODEOWNERS review enforcement must be confirmed
  in GitHub; adding a CODEOWNERS file does not activate protection by itself.
- This code does **not** install the external app, configure its permissions,
  create a Model API key, or prove a live Muse session can write.

## Gate 004 — fail-closed main-branch protection

- The public GitHub `NEO` ruleset (ID `20772609`) was active on
  November 3, 2026 but contained **no rules**. This does *not* certify
  whether a separate legacy branch-protection rule exists.
- The GitHub connector cannot read the legacy branch protection endpoint
  (HTTP 403). It also cannot inspect the `MODEL_API_KEY` secret.
- The `scripts/neo-muse-branch-guard.mjs` workflow preflight checks active
  repository rulesets *before* invoking the secret-bearing AI coding action.
  It **fails closed** unless an active ruleset covering `main` requires
  at least one approval, code-owner review, and a nonempty set of required
  status checks. No credentials are printed.
- The owner must configure the ruleset in GitHub Settings → Rules →
  Rulesets and choose the existing `NEO` ruleset (or create a new protected
  main branch ruleset). Also verify Actions can create pull requests.
- No `/oc` documentation smoke test should be issued before the ruleset
  is configured, GitHub tests pass, and the Muse API live check succeeds.
- `server/neo-router/muse-branch-guard.test.mjs` verifies the observed
  empty ruleset is rejected and a correctly protected ruleset is accepted.

## Gate 002 validation
- The new `server/neo-router/muse-github-gate.test.mjs` test verifies model
  environment references, owner-only triggers, bounded workflow rights,
  protected paths and review controls. It is part of the existing npm test
  glob and should run in PR CI.
- Verified repository CI before Gate 002 updates was green. Latest Gate 002
  CI and live PR-writing behavior require independent verification.

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
