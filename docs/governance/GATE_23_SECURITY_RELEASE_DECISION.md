# Gate 23 — Oracle Security Release Decision Register

Date: 2026-10-22. Status: CI PASSED; STAGING RELEASE NOT YET AUTHORIZED.

## Verified CI
- Branch security/gate-19-oracle-server-integration, commit a51765eeae7d60d4b133aab493fa7b48de0c6943.
- GitHub Actions run 39869358164: completed, conclusion success.
- Build job 120139563013: success. npm ci, npm run build, npm test all success.
- Related workflows for this commit completed successfully, but none authorize staging or production rollout.

## Release blockers and decisions
- BLOCKER (human): Approve or amend API access policy draft PR #1090, including whether green reasoning must authenticate by default.
- BLOCKER (human): Review integration draft PR #1092. It is not merged.
- BLOCKER (security): The prototype reuses NEO_PRIME_OPERATOR_TOKEN for ordinary AI access. A separate least-privilege API credential/identity model is required before end-user exposure.
- BLOCKER (security): Implement enforceable per-client rate limits, concurrency ceilings, provider budgets, credential rotation, and safe logging before any public AI execution rollout.
- BLOCKER (release): Confirm authorized staging service, environment secrets via existence checks only, rollback target, smoke-test owner, and deployment approval.
- OPEN: Confirm that unknown capabilities/actions fail closed in the complete HTTP/runtime path, not only in the access tier classifier.

## Proposed staging acceptance checks
1. CI green on exact deploy commit and review approvals recorded.
2. GET / and /oracle load as intended; GET /healthz returns minimal status; GET /health requires authentication.
3. Unauthorized/malformed POSTs fail before planning or provider invocation; wrong tokens fail closed.
4. Authorized green request runs only with a least-privilege credential and budget enforcement.
5. Privileged action needs explicit per-action approval, separate operator identity and auditable records.
6. Disallowed Origin does not bypass authentication; logs and error bodies do not expose secrets.
7. Rollback verified; no unapproved changes to production.

## Decision
NO-GO for staging deployment until policy, credential separation and budget/rate safeguards are approved and implemented. NO-GO for production.

## Next milestone
Gate 24 — create a review-only least-privilege API-token separation proposal and tests; no secret changes, merges or deployments.
