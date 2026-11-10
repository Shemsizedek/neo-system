# NEO-GITBOOK-002 — GitBook Free integration preflight

**Prepared:** 2026-11-10
**Source:** `Shemsizedek/neo-system`, PR #1402, branch `docs/neo-gitbook-001-curated-public`.
**Status:** staged/review-only; no GitBook account authorization, sync, preview URL, or public publication has been verified.

## Implemented in this gate

- Curated content remains under `docs/gitbook-public/`, separate from broad repository content.
- A dependency-free Node validator at `scripts/check-gitbook-public.mjs` checks Markdown headings, all navigation targets, relative links, selected credential signatures and email-address patterns, and foundation/sandbox notice.
- A minimal, read-only GitHub Actions preflight runs for pull requests that change the public docs directory, validation script or workflow.
- **Limits:** checks are patterns, not a complete secrets/PII, copyright, legal, financial, or historical-commit audit. External links and rendered GitBook previews require separate verification.

## GitBook Free setup (pending owner approval and browser sign-in)

1. Sign in to https://app.gitbook.com and select an individual **Free** workspace, not a time-limited paid trial; verify billing shows $0.
2. Create a site/space named **NEO System Documentation**.
3. Choose **Set up Git Sync** > **GitHub**. In the GitHub authorization screen grant GitBook access to **only** `Shemsizedek/neo-system`, not all repositories. Stop if GitHub requests a materially broader scope.
4. Select the repository and review branch first for preview if supported. In monorepo/project directory, set **`docs/gitbook-public/`**. Verify the selection excludes the parent `docs/` and repository root.
5. Set **GitHub → GitBook** for initial import; do not use reverse import.
6. Inspect all six navigable pages, view on mobile and desktop, inspect any generated files, and confirm no extra pages appear in the published space.
7. Audit effective Git Sync write access and branch-review controls. Git Sync is bidirectional **after first import**, so automatic GitBook editing must not bypass GitHub review. If this cannot be controlled, use a separate public-docs-only repository or dedicated sync branch and manually promote approved changes.
8. Publish only after a human reviewer authorizes public content, the full GitBook preview is inspected, and expected billing remains $0.

## Explicit unresolved approvals

- [ ] GitBook owner account/Free-plan selection approved and signed in.
- [ ] GitHub App installation and single-repository permission approval granted.
- [ ] Monorepo path scope confirmed in GitBook's actual UI.
- [ ] Privacy/security/legal/financial/copyright content review completed.
- [ ] Published site audience and URL approved.
- [ ] Review branch/PR approved for merge to `main` after gate checks.
- [ ] GitBook two-way writeback controlled by protected review workflow.

## Release decision

**HOLD** GitBook connection/publication, and **HOLD** PR merge. This milestone documents a reproducible automated preflight and a narrowly scoped manual connection procedure. No production activation is represented.
