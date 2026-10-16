# CSC-GISS-012 — Institution onboarding and deployment readiness

Status: REVIEW REQUIRED. This document does not create members, grant offices, authorize production deployment or change an existing institution's charter.

## Verified CI
For commit d2499b96b56fcd8f58cb533ff489932390a5c851, GitHub CI, NEO Discord Primary Control Plane, and NEO Miner Production CI completed successfully. Vercel reported a build-rate-limit failure. These checks do not independently establish that the new dashboard-specific tests were run or that the portal is live.

## Institution onboarding protocol
1. Institution representative submits institution name, type (Moorish Science Temple branch, church, temple school or other GISD participant), governance source, requested administrator and approved membership evidence.
2. Authorized GISD reviewer verifies provenance, institutional consent, requested scope and uniqueness of institution identifier. Independent institutions retain their own jurisdiction.
3. Approving authority records explicit decision and audit reference. Do not infer appointment from a course, title or organizational chart.
4. Provision gisdInstitutions and gisdInstitutionMemberships through a separately approved server-side administration workflow; never via untrusted browser-supplied roles.
5. Verify read-only institution dashboard access with an actual signed-in NEO Pass member, then test negative cross-tenant and expired-token cases.
6. Enable institution-specific reporting only after data classification, retention policy, audit logging and least-privilege review.

## Release blockers
- No approved onboarding write API or approved operator workflow has been implemented.
- The production route uses a Firestore loader; collection indexes, security rules, data population and deployed configuration require verification.
- The dashboard route has not been demonstrated with a real signed-in member.
- Verify that the CI workflow actually executes giss-admin-route.test.mjs, firestore-gisd-institution-context.test.mjs and the other CSC-GISS tests.
- Confirm deployment host, route mapping, secrets, audit and rollback plans.
- Source-image archiving and expired Chaplaincy Instructions remain document-certification blockers.

## Release decision
No merge or deployment until authorization, tenant isolation, dashboard-specific test execution and operational verification are documented. Vercel build-rate-limit is non-blocking for a separately certified Google Cloud deployment.
