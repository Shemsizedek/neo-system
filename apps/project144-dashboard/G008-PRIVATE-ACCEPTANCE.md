# PROJECT144-G008 — Private access activation decision

## Verified engineering state
- G005 CI passed in GitHub; G006 verifier committed.
- G007 acceptance workflow now targets **self-hosted runner labelled `project144-private`** rather than an internet-hosted runner that cannot reach an isolated private service.
- The private gateway URL is omitted from verifier output.
- No Render private service has been provisioned through the connector; its current create action provisions public web services only.
- No operator identity gateway, self-hosted runner, or end-to-end mobile login has been confirmed.

## Required operator infrastructure
1. Provision a **Render private service** using `apps/project144-dashboard/render-private.yaml` in a suitable workspace, subject to Render plan/Blueprint support.
2. Establish a user-identity-aware gateway/zero-trust route or VPN with strong authentication and mobile support; leave the Render private service without any direct public route.
3. Provision an isolated, trusted private-network GitHub Actions runner with label `project144-private`; limit it to manual, approved acceptance workflows. Do not schedule jobs from untrusted forks on this runner.
4. Store operator and gateway values in GitHub environment `project144-private-acceptance` with approval protection; do not expose secrets in logs.
5. Run the manual `project144-g007-acceptance.yml` only when service+gateway+runner exist.
6. Independently verify mobile Android and Chromebook access, expired sessions, wrong identity, blocked public routes, uptime, GitHub contents metadata, NEOsync status feed.
7. Only mark G008 accepted after collecting screenshots, CI logs, ingress-policy evidence, and signed operator approval.

## Acceptance caution
HTTP Basic Authentication within the application is a second check, not sufficient as the primary identity gate. Access proxies may return 302/403 before app 401, in which case the smoke verifier must be adapted to validate the gateway's expected fail-closed behavior rather than bypass its security.

**No URL is cleared for publication or sharing before these checks.**
