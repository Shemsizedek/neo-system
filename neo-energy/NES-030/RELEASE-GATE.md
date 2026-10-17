# NES-030 — Release acceptance decision

## Verified prior milestones
NES-028 HTTP/database privilege tests passed on a previous commit. NES-029 full HTTP-to-PostgreSQL workflow was still running when NES-030 began; do not mark it successful without a corresponding completed green run.

## Implementation
- Browser adapter permits only same-origin read-only requests with explicit caller-provided credentials.
- Rejects any response not explicitly SIMULATION_ONLY with payment_due=false and field_control_authorized=false.
- Tests require denial of unsafe responses and nonrelative API addresses.

## Deployment blockers
Real NEO Pass energy-scoped token issuance and revocation; backend server-managed session grants; secure browser session handling (prefer HttpOnly cookies over JavaScript-accessible bearer tokens), CSRF/cookie protections, hardened TLS, controlled network access, security assessment, real pooled PostgreSQL tenant tests, migration backups and restores, log redaction, rate limiting, accessibility and privacy review.

The browser adapter is not an authenticated deployed dashboard. It neither issues credentials nor starts services. The user must explicitly approve any merge, deployment, billing or actuation.
