# NES-017 — Read-only Energy API Gateway

Implements a small WSGI application factory with a **mandatory injected session verifier** and site-scoped customer-service interface.

This is a gateway skeleton, **not** proof of production-ready NEO Pass authentication. The authentication provider is intentionally absent: starting without one raises an exception. Never wire test lambdas or trusted request headers into production; use an audited NEO Pass verifier with JWKS, issuer/audience validation, expiry and revocation rules, tenant grants and rate limiting.

## Endpoint
GET /v1/energy/customer/sites/{site_id}/overview

Other routes and all writes are rejected. Responses carry no-store caching. CustomerService from NES-015 must enforce site authorization; the gateway never accepts user-provided account grants.

## Testing
Run `python -m unittest discover -s neo-energy/NES-017 -p 'test_*.py' -v`.

## Outstanding approval barriers
- Trusted NEO Pass session validator / real server-managed site grants
- Hardened HTTP server, limits, request tracing, TLS, CSRF/cookie controls, security review
- Schema validation, PostgreSQL migrations, audit logging and backups
- UI connection only after authentication and tenant isolation tests
- Real meter input, billing, CES/NOMNI settlement and physical command paths remain disabled

No cloud deployment, actual customer data access, or energy system actuation.
