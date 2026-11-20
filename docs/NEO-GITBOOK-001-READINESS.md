# NEO-GITBOOK-001 — GitBook readiness and approval gate

**Status:** prepared on a draft GitHub pull request; no GitBook organization, app installation, sync or publication is established by this change.

## Repository audit (2026-11-10)

- Repository: `Shemsizedek/neo-system`; primary branch `main`; public.
- Snapshot inspected: 3,748 tracked tree entries, including 509 Markdown files and 209 Markdown files under `docs/`.
- Existing `docs/` contains platform architecture, educational doctrine, legal and case materials, financial workflows, governance and security-adjacent details. Some paths may be inappropriate for external knowledge indexing.
- Existing root README labels the software `FOUNDATION / SANDBOX`, not validated financial, judicial or government operations.
- Root `SECURITY.md` is a default/template disclosure document; a formal private reporting policy is not yet recorded there.
- No existing GitBook configuration or SUMMARY.md was found in the snapshot.

## Proposed initial public source

- Repository: `Shemsizedek/neo-system`
- Content folder: `docs/gitbook-public/` **only**
- Production sync ref: `main` **after** this pull request is reviewed and merged.
- Initial direction: GitHub → GitBook.
- Public navigation: maintained manually in `docs/gitbook-public/SUMMARY.md`.
- Hosting: GitBook Free (one editor; standard GitBook domain; no required custom domain).
- Canonical change control: GitHub pull requests and reviews; no unconditional push to main.

## Approvals required before connecting/publishing

- [ ] GitBook organization/site ownership and administrator account approved; verify Free plan and no billable trial.
- [ ] Explicit approval to install GitBook GitHub App with access only to `Shemsizedek/neo-system`.
- [ ] Confirm Git Sync folder selector supports `docs/gitbook-public/` for this account/plan.
- [ ] Explicit approval for bidirectional GitBook Git Sync to write commits; branch protection and review workflow inspected.
- [ ] Designated editorial/publication reviewer approves the seven-page starter as public.
- [ ] Secret/PII/link/content classification review and GitBook preview completed.
- [ ] Published site URL and public-access choice approved.
- [ ] Verification that no repository-root or bulk `docs/` documents are included in GitBook indexing.

## Test/acceptance requirements

1. `SUMMARY.md` resolves every relative path within the selected folder.
2. Preview navigation, titles, mobile readability, and all external source links.
3. GitBook only renders expected curated pages.
4. Confirm Free tier charges remain $0 and no optional paid domain/AI features activated.
5. Record GitHub App scope, sync direction, chosen branch, approved reviewers and rollback plan.
6. No automatic public release before approval.

## Fallback

If folder-level sync is unavailable or introduces broader repository privileges, create a dedicated **public-docs-only** repository with reviewed Markdown exported from `docs/gitbook-public/`, then sync that repository alone. Do not grant wider scopes as a workaround.
