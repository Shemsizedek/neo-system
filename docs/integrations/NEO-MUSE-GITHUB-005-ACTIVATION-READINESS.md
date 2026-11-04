# Gate 005 — Read-only activation preflight

## Verified blocker (2026-11-03)

The active GitHub repository branch ruleset `NEO` (20772609) applies to
all branches but currently has an empty `rules` array. This ruleset does not
enforce reviews or required checks. The connected GitHub app could not read
legacy branch protection (403); do not infer its state from this result.

No successful Muse-authored pull request or authenticated Meta API probe has
been independently verified. The most recent owner-triggered Muse writer
runs observed through the API were skipped, not passed.

## New operator diagnostic

Run **GitHub Actions → NEO Muse Activation Readiness → Run workflow**.
The workflow is manually triggered, read-only, and does not invoke Muse.
Its Job Summary checks the presence (never value) of the `MODEL_API_KEY`
Actions secret and the enforcement of main-branch pull-request approvals,
code-owner reviews and required CI checks.

A passing preflight means **ready to attempt a Meta API live check**, not
that Muse has GitHub write privileges or that its consumer app was authorized.

## Configure policy and test

1. Open https://github.com/Shemsizedek/neo-system/rules/20772609
2. Apply the ruleset specifically to `main` if desired; remove unintended
   bypasses that could let writer identities push around review requirements.
3. Add a required pull-request rule (at least one approval and code-owner
   review) and a required status check matching a completed GitHub CI check,
   e.g. `build` if that is the actual exact check name.
4. Save and enforce; run the read-only Activation Readiness workflow again.
5. Verify `MODEL_API_KEY` in GitHub Actions repository secrets and that
   Actions are permitted to create pull requests.
6. Use **NEO Router Muse Live Check** to test authenticated Meta Model API.
7. Only after the live check passes, post the documentation-only `/oc`
   instruction in issue #1338. Confirm a Muse-created feature branch/PR.
8. Review PR, ensure no secret data was disclosed, and independently
   confirm `main` was not modified.

## Security boundaries

The activation preflight has `contents: read`, no elevated credentials,
no API model invocation, and no GitHub write action. It never echoes the
API key or the GitHub token. It also does not attest the external Meta Muse
GitHub App installation, branch-bypass identities, or the repository's
Actions-created-PR setting; those require separate GitHub verification.

This workflow deliberately fails when protection or secret presence cannot
be verified. Never submit credentials in issues or code.
