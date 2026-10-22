# Gate 20 — Oracle Integration CI Failure and Remediation

Date: 2026-10-22. Status: REMEDIATION COMMITTED; RE-RUN CI NOT YET VERIFIED.

## Evidence
- Draft integration PR #1092: https://github.com/Shemsizedek/neo-system/pull/1092
- Initial integration commit e6f2a9ce77ecb1f69c4693043f04e9828ed20a9d.
- GitHub Actions CI run 39868665939 failed; build succeeded, npm test failed. Job 120137252267 reported 783 tests: 782 passed, 1 failed.
- Failed test: server/neo-prime/server.test.mjs:55, 'approval-gated command stops without explicit authorization'. At line 65 expected approvalRequired=true, but 401 authentication response did not include that field.
- Fixed the test expectation on review-only branch security/gate-19-oracle-server-integration, commit a9f2f7ab41dfcc4d5c422eabdaf5c58b9854b97c. The test now explicitly expects no approvalRequired field on an unauthenticated 401 response.
- At check time no GitHub Actions workflow runs were returned for the fix commit; do not claim passing CI.

## Security review observations
- The integration invokes prime.plan before authentication, so authorization is enforced before provider execution but not before planning. Confirm that planning is local, bounded, and side-effect-free; ideally authenticate before planning for protected execution routes.
- Existing /healthz still reveals detailed provider inventory, contrary to Gate 16's minimal public liveness proposal. Split public and authenticated health response bodies before release.
- Existing integration uses the operator token for all green AI requests. End-user identity, rate limiting, quotas and credential rotation remain unresolved.
- Existing privileged authorization still requires body approved flag and explicit approval header; test these cases at HTTP level after authentication is wired.

## Approval boundaries
- No merge, deployment, secret inspection, permission change or production rollout performed.
- API policy PR #1090 requires human approval before behavioral integration.

## Gate 21 milestone
Validate remediation CI; if green, add early-auth and health-information-minimization regression coverage on the review branch, then prepare staging-only release checklist. No deployment without approval.
