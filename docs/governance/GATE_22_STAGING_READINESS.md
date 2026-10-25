# Gate 22 — Oracle Hardening CI and Staging Readiness Checklist

Date: 2026-10-22. Status: CI FIX COMMITTED / REVALIDATION PENDING.

## Verified evidence
- Hardening commit 20ccb1e6e335d4ba8b104fd482dda976570fac92: CI run 39869197516 completed failure, job 120139030427 failure at npm test.
- GitHub Actions job logs reported 784 tests: 783 passed, 1 failed.
- Failing test server/neo-prime/server.test.mjs:29 expected the legacy /healthz provider detail fields; current public /healthz intentionally returns minimal status.
- Fixed the test expectation on branch security/gate-19-oracle-server-integration, commit a51765eeae7d60d4b133aab493fa7b48de0c6943. Re-run CI not yet confirmed.

## Staging release prerequisites
1. Obtain human approval of API access policy PR #1090, including green AI access defaults and credentials model.
2. Obtain security/code review of integration PR #1092 and ensure CI success at the final commit.
3. Verify staging service identity, deployed commit, Render config, authorized operator and rollback target without exposing secrets.
4. Decide identity separation: the prototype currently uses the operator token for ordinary authenticated AI calls; avoid sharing this powerful token with end users.
5. Implement per-client request limits, concurrency ceilings, token/provider budgets and secret-safe error logging before public exposure.
6. Ensure privileged commands require explicit human authorization; test unknown actions fail closed.
7. Run read-only HTTP smoke tests on /, /healthz, /health and POST aliases in a controlled staging environment; verify unauthorized requests do not invoke providers.
8. Prepare change window, backup/rollback plan, alerting, ownership, and explicit deployment authorization.

## Scope boundaries
- This gate changes only a review-branch test expectation and records the checklist.
- No merge, deployment, service setting, credential or permission changes.

## Gate 23 milestone
Confirm new CI outcome, review the remaining operator-token exposure and request-limit risks, then decide whether a staging-only release can be authorized.
