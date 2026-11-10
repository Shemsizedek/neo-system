# NEO-GITBOOK-003 — Connection and publication acceptance

**Decision at preparation (2026-11-10): HOLD public launch; documentation checks passed, but GitBook account/Git Sync is not connected.**

## Verified, source-backed baseline

- Curated GitBook content is staged under `docs/gitbook-public/` in GitHub PR #1402 (not merged).
- The current `docs-preflight` job passed on PR #1402 at https://github.com/Shemsizedek/neo-system/actions/runs/42909352583.
- GitBook Free includes Git Sync and previews: https://www.gitbook.com/pricing
- Git Sync supports repository branch and monorepo folder selection; changes sync **both ways** after initial import: https://gitbook.com/docs/guides/editing-and-publishing-documentation/import-or-migrate-your-content-to-gitbook-with-git-sync
- An active GitHub ruleset named `NEO` is returned on the repository, but its REST metadata lists **zero rules**. Branch protection detail is inaccessible to the connected GitHub integration (403). **Do not assume GitBook can be stopped from direct writes to main.**
- GitHub checks include eight failed Cloudflare Workers builds on the head commit; no causal relationship to the GitBook docs change has been established. They should be reconciled separately, not treated as successful release evidence.

## Critical scope distinction

A **GitBook monorepo folder selection is a content import/publishing scope, not a GitHub App authorization boundary**. If GitBook is installed for `Shemsizedek/neo-system`, the integration can have repository-wide permissions consistent with GitHub's app grant even when only `docs/gitbook-public/` is displayed. A public repository can still contain content unsuitable for amplification, and a write grant may exceed the documentation folder.

**Preferred least-privilege path:** after approving export and repository creation, establish a separate public `neo-system-docs` repository holding only reviewed content exported from the existing `docs/gitbook-public/` source. Point GitBook at the dedicated docs repo, not the production code repository. Keep upstream NEO's source versioned and synchronize only via reviewed PRs or an explicitly audited one-way publishing workflow. Avoid automated bidirectional writes to primary application branches.

**Alternative if the existing repository must be connected:** approve the GitBook App's actual repository permissions, verify robust protected-branch rules with required PR review/status checks, use a dedicated docs sync branch, and enforce constrained promotion to `main`. Otherwise stop.

## Human-verified GitBook preview

1. Open https://app.gitbook.com and sign in as authorized owner. Confirm **Free $0** rather than starting paid trial or purchasing domain.
2. Select/create `NEO System Documentation` site. Do not publish yet.
3. Review GitBook App permissions in the GitHub consent screen; authorize only the explicitly selected docs source repository. Refuse broader account/repository grants.
4. Verify Git Sync branch, monorepo folder `docs/gitbook-public/` (if using source repo), and first-sync direction `GitHub → GitBook`.
5. Inspect GitBook **Preview**, including mobile and desktop. Confirm six expected navigable pages and no additional imports (especially `personal/`, `audit/`, `governance/` or general `docs/`).
6. Confirm rendered headings, Markdown links, source URLs, crawlable content, no sensitive metadata, and fallback/404 behavior. Record preview URL, user, UTC timestamp, and actual plan **without storing tokens or private details**.
7. Complete owner approval of content, public audience, and final URL. Review branch and merge gates; do not permit direct GitBook writes to unprotected `main`.
8. Publish only after each acceptance condition is independently met. Re-run GitHub docs-preflight on final source revision, and check published site against preview.

## Evidence required before changing HOLD to PASS

| Criterion | Current evidence | Status |
| --- | --- | --- |
| Public Markdown and navigation | GitHub PR #1402 | PASS (source) |
| Validator regression suite | Added in this gate; verify CI run | PENDING verification |
| GitBook Free workspace created | No authenticated workspace evidence | HOLD |
| GitHub App limited to approved repository | No grant evidence | HOLD |
| Source sync folder and branch | Not connected | HOLD |
| Protected branch / safe writeback | Ruleset metadata has zero enforcement rules | HOLD |
| GitBook preview URLs + page audit | No GitBook preview available | HOLD |
| Security, privacy, accuracy and copyright signoff | Automated patterns only | HOLD |
| Public publication signoff | Not provided | HOLD |
| No unapproved paid cost | Free tier documented, no account billing evidence | HOLD |

## Rollback plan

Stop Git Sync from the GitBook account; revoke the GitBook GitHub App for the approved repo if necessary; unpublish the GitBook site; preserve approved Markdown in GitHub; audit any unexpected GitBook-authored commits. Revocation and unpublishing require owner-approved access. Do not claim this rollback was executed until evidence is available.

**Release conclusion:** The current gate can prepare acceptance controls but cannot honestly certify or deploy a GitBook site until the owner signs in and authorizes the narrowly scoped integration.
