# NSEC-061 — Protected Noogle Connect edge authorization gate

Audit 2026-10-14: Cloud Certificate Manager reports `neo-edge-holytemples-wildcard` ACTIVE for `*.holytemples.org` (GitHub workflow run 38655157713). The existing HTTPS load balancer address is `8.232.127.249`. URL map does not yet contain `connect.holytemples.org`. The private `noogle-connect-staging` Cloud Run service is revision `noogle-connect-staging-00002-7k2`.

## Critical distinction

**Cloud Run IAM-private status is not sufficient proof of protected access through an external HTTPS load balancer.** The LB/serverless NEG authorization and identity model must be verified separately. Do not add a public host rule to this private staging service unless authenticated ingress has been tested independently.

## Approval prerequisites

1. Inspect whether the intended dedicated backend uses Cloud IAP or an equivalent verified edge authentication policy, and check that authorization is enforced before routing.
2. For NEO Pass user access, verify a real secure-session architecture and server-side WebAuthn account binding; the current release is read-only and has no functional NEO Pass login.
3. Build a dedicated serverless NEG and backend plan that does not alter existing route matchers or the default backend. An access-controlled origin must reject anonymous end-to-end requests.
4. Confirm wildcard TLS handshake at the chosen LB endpoint using hostname-specific SNI; ACTIVE certificate-manager status alone does not prove serving config.
5. Only then add routing; separately approve and create the WordPress.com DNS A record for `connect` after end-to-end protection is confirmed.
6. Keep passkey registration, signing, device enrollment and Chromebook remote commands disabled pending their own certifications.

## Release

Gate: **HOLD public DNS and routing**. This is a review-only architecture record. No IAM, DNS, TLS, Cloud Run or load-balancer changes.
