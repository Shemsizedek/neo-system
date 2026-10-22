# Gate 11 — Connected Render Infrastructure Evidence

Date: 2026-10-22. Status: CONNECTED ACCOUNT VERIFIED / DEPLOYMENT STATUS LIVE / ENDPOINT HEALTH NOT INDEPENDENTLY TESTED.

## Verified connected account
- Render workspace: NEO workspace (tea-db8bbpij9qps73cb7gb0).
- Both linked Render accounts returned this same workspace. This does not imply duplicate infrastructure.
- Render service inventory includes neo-core-staging, neo-oracle-staging and additional NEO staging services. Full inventory classification remains pending.

## Service evidence
| Service | ID | Render URL | Reported deploy | Commit | Auto deploy |
| --- | --- | --- | --- | --- | --- |
| neo-core-staging | srv-dbcgvaom7kps739ujmm0 | https://neo-core-staging.onrender.com | dep-dbcgvb0m7kps739ujn90 live (2026-10-21) | a7aba09fea76d42b31114388792cf082ee66f4ea | off |
| neo-oracle-staging | srv-dbcn2oqvcj2c73f76um0 | https://neo-oracle-staging.onrender.com | dep-dbcn2pavcj2c73f76vpg live (2026-10-22) | d290a2aec9818b56c01f04716e6ac823db69f958 | off |

## Control observations
- NEO Core staging is a static site publishing dist; its configured build checks out a pinned commit and runs npm ci, npm test and RENDER=true npm run build.
- NEO Oracle staging is a Node.js web service with a targeted test build and node server/neo-prime/server.mjs start command.
- Both have Render public URLs and 0.0.0.0/0 access list. Public exposure requires application-layer access review where sensitive features exist.
- Oracle healthCheckPath is blank in returned configuration; service-reported live status is not independent HTTP health evidence.

## Open controls
- Verify HTTP responses, authentication boundaries, error logs, alerting, backups, recovery and rollback.
- Confirm approved production topology and whether NEO Core official endpoint matches Render staging.
- Review staging commit pinning against current source and release policy.
- Audit Render workspace member roles and secret access without disclosing credentials.
- Obtain Temple-authorized production signoff; keep all regulated/governmental/custody modules within sandbox boundary until separately approved.

No deployments or service configuration changes performed in this gate.
