# Gate 12 — Service Health and Security Boundaries

Date: 2026-10-22. Status: BUILD/START LOGS VERIFIED; LIVE HTTP AND SECURITY TESTS OPEN.

## Evidence from connected Render logs
- neo-core-staging (srv-dbcgvaom7kps739ujmm0): build logs report Vite 6.4.3, 1687 modules transformed, dist/index.html and compiled CSS/JS assets. Build log warns a JavaScript chunk exceeds 500 kB after minification (index JS 555.53 kB, gzip 158.89 kB); optimization backlog item, not necessarily a release blocker.
- neo-oracle-staging (srv-dbcn2oqvcj2c73f76um0): build log reports fail 0 and Build successful; runtime log shows node server/neo-prime/server.mjs starting and [neo-prime] listening on :10000.
- Previous Render deployment API returned live status for both services; autoDeployTrigger off. These are provider observations, not independent HTTP probes.

## Security boundary findings
- Both staging services have public Render URLs and 0.0.0.0/0 network allowlists; network-level IP restriction is not configured in returned metadata.
- Oracle returned an empty healthCheckPath; do not equate a running process with healthy application functions.
- Authentication, sensitive API endpoints, CORS, security headers, secrets handling, application permissions, monitoring and backup/rollback are NOT VERIFIED.
- Do not test authenticated endpoints or expose sensitive responses without scoped authorization.

## Action queue
| Priority | Work item | Acceptance |
| --- | --- | --- |
| P0 | Independent read-only HTTP checks on core and oracle staging | timestamp, status, response metadata, safe endpoint evidence |
| P0 | Review staging route exposure and auth boundaries | route inventory, anonymous access expectations, tests |
| P0 | Add explicit non-sensitive health endpoint for Oracle if approved | documented response contract, automated health checks |
| P1 | Review Render alerts, rollback and incident ownership | verified recovery plan and contact |
| P1 | Address large frontend JS bundle | measured before/after bundle and performance impact |
| P0 | Confirm Temple authority and production approval chain | authenticated source, named signatories |

No deployment, configuration, permission, secret, or production change made.
