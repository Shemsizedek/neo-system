# NSEC-064 — Noogle Connect protected edge design decision

Evidence: GitHub Actions workflow run 38656292876 (2026-10-14).

## Verified live state
- No host rule for `connect.holytemples.org` in `neo-edge-url-map`.
- No backend or serverless NEG with `noogle`/`connect` in its name.
- Cloud Run service `noogle-connect-staging` revision `noogle-connect-staging-00002-7k2`; ingress `all`; Cloud Run invoker IAM enforcement enabled.
- Wildcard managed TLS certificate `neo-edge-holytemples-wildcard` ACTIVE for `*.holytemples.org` (workflow 38655157713).
- WordPress.com DNS for `connect` remains absent.

## Security architecture
A private Cloud Run IAM policy is NOT a complete browser-facing authorization policy behind a Google external Application Load Balancer/serverless NEG. In particular, do not assume Cloud Run invoker checks automatically protect requests forwarded via the LB.

Required order before any public routing:
1. Define a separate Noogle Connect LB backend using serverless NEG (planning only).
2. Determine whether Cloud IAP is supported and correctly configured for this backend, including OAuth brand, authenticated identities, authorization memberships and protected IAP access tests.
3. Prefer ingress `internal-and-cloud-load-balancing` **only with separate Cloud Run IAM/invoker validation** and verified health behavior; changing ingress is a release action, not part of this design.
4. Test anonymous 401/403 and approved-user 200 through the actual LB hostname, with no fall-through to existing NEO routes.
5. Route read-only UI only; keep `/api/guardian/passkeys/*`, enrollment, signing, voting and remote shell denied.
6. Only after verified edge access and SNI/TLS testing approve the WordPress.com DNS A record for `connect` to the known LB IP.

## Release hold
No DNS, IAM, IAP, serverless NEG, backend, URL map, certificate, Cloud Run or APK mutation approved by this document. Authentication PR #909 remains separate.
