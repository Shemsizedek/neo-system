# Gate 13 — Endpoint Verification and Security Hardening

Date: 2026-10-22. Status: SOURCE REVIEW VERIFIED / INDEPENDENT ENDPOINT HTTP UNVERIFIED.

## HTTP probe result
- Attempts to open https://neo-core-staging.onrender.com/ and https://neo-oracle-staging.onrender.com/ through available web access returned inaccessible tool errors.
- A separate Python requests probe from the execution container failed DNS resolution for both domains. This reflects probe environment limitations and does NOT establish service downtime.
- No independent HTTP response status, latency, TLS, response headers or current application health has been verified.

## Source-derived Oracle controls (server/neo-prime/server.mjs on main)
- GET /health and /healthz call router.health(), returning 200 on ok and 503 otherwise.
- GET /, /oracle and /oracle/ serve Oracle HTML with CSP, X-Content-Type-Options nosniff, Referrer-Policy.
- CORS uses explicit allowlist (default shemsizedek.github.io, holytemples.org, www.holytemples.org, oracle.holytemples.org). CORS is not an authentication boundary.
- POST /api/prime, /prime, /api/oracle reject disallowed Origin headers, but requests without Origin continue to the handler.
- For missions where plan.approvalRequired is true, execution requires approved=true, bearer operator token, and x-neo-prime-approval=approved. Missions not requiring approval may execute without the operator token; review capability classification, rate limits, abuse prevention and data exposure.
- Request JSON body size defaults to 64 KiB.

## Priority security actions (proposed; not deployed)
1. Require an authenticated principal or tightly scoped public capability policy for all execution endpoints; separate public read-only Oracle queries from privileged actions.
2. Verify guard risk classification with tests for each privileged action and fail-closed on missing configuration.
3. Add rate limiting, audit identifiers and safe redaction for logs and error responses.
4. Configure Render healthCheckPath /healthz after confirming safe response contract; avoid exposing sensitive provider metadata.
5. Independently probe staging HTTP/TLS/headers from an authorized network and record timestamp and evidence.
6. Audit production routing, secrets, branch/environment approvals, monitoring, backups and rollback.

No endpoint, deployment, authorization policy, secret or service configuration was modified in this gate.
