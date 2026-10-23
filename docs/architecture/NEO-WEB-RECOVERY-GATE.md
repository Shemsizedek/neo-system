# NEO Web — provider-independent recovery gate

Status: design and verification only. No DNS cutover or production migration authorized by this document.

## Mission
Keep GISD/NEO Cipher education access, Templist Portal and NEOpass discoverable and recoverable when one hosting provider fails. A static continuity page is not equivalent to a working school or authentication service.

## Existing building blocks
- `architecture/neo-hosts.json` records the current Cloud Run host map; it must not be silently rewritten.
- `architecture/neo-sovereign-hosting-policy.json`, `architecture/neo-workloads.json` and `scripts/neo-sovereign-hosting.mjs` provide portable workload validation and self-host readiness gates.
- `server/neo-network/` implements network registry and authorized failover routing.
- Existing Render edge, platform API and portal recovery services are candidates for shadow verification, not proven replacements.

## Minimum independent recovery paths
1. Primary application provider: retain current Cloud Run mappings until live school and identity flows are proven elsewhere.
2. Shadow application provider: existing Render services, with isolated staging URLs and no production DNS changes.
3. Public static continuity: independent static hosting of non-sensitive school status, contact and recovery instructions; no student data, tokens, wallet keys or login impersonation.
4. Sovereign option: NEO-owned OCI-compatible self-hosting only after hardware, operator, security, backups, network and funding gates pass.

## Readiness checks before cutover
- Confirm DNS and TLS ownership and measure each public host's HTTP status, redirects and response content.
- Verify GISS enrollment, authenticated classroom, NEO Cipher learning interface, and NEOpass Google sign-in/session/logout on shadow URLs using test identities only.
- Confirm external health monitoring, alert destination, runbook ownership, rollback TTL and recovery-time targets.
- Confirm database backup restore in an isolated environment; do not mirror or export live student records to public/static hosting.
- Check routing isolation, role authorization, CSRF/session security, secrets and origin policy; default-deny privileged routes.
- Require a documented rollback to Cloud Run and explicit approval for DNS, identity-provider, database-primary or production secret changes.

## Provider selection principles
Use portable build artifacts, independent health evidence, exportable configuration, least privilege, clear free-tier limits and independent DNS ownership. A free-tier service may sleep, throttle, expire or lack an SLA; do not promise 24/7 availability without testing and suitable operational coverage.

## Policy reconciliation
`docs/DEPLOYMENT-HIERARCHY.md` restricts providers while newer Render migration work and sovereign-hosting policy permit other paths. Treat this as an unresolved architecture decision. Do not silently enable Vercel, Cloudflare or any new provider; evaluate and explicitly approve per workload.

## Immediate restoration sequence
P0: GISD school URL and classroom probes; P0: NEOpass login and session readiness; P1: Templist Portal school and Cipher integration; P1: independent continuity site and monitoring; P2: tested self-host fallback.
