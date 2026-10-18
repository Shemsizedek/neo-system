# CASHFLOW-012 — Identity & Live Staging Certification Gate

**Status: Source ready for review; not certified or deployed.**

Confirmed Neon project `mute-rice-57396659` contains one synthetic test lead. Live DB was read via Neon connector, but the application has not connected to it.

## Access boundary
`operator-handler.mjs` exposes read-only operator metadata behind an injected `verifyIdentity` function. **No concrete OIDC/JWKS verifier has yet been configured.** The injected verifier must validate JWT signature against trusted JWKS, issuer, audience, expiry, nonce as appropriate, alg allowlist, key rotation and role claims. Never derive `verified` or `roles` from caller-controlled HTTP headers, JSON or unsigned JWT. Configure a private network ingress or verified identity gateway prior to listening on a public interface. Existing public Render Deal Desk proxy must remain unchanged.

## Deployment requirements
- Secrets: `DATABASE_URL` only in approved secrets store, never source or logs.
- Application dependencies: `pg` driver installed with lockfile; CA/TLS host verification tested against Neon.
- OIDC: audited JWT verifier middleware, secrets and JWKS cache safely configured; deny unsigned or expired credentials.
- Restrict to synthetic data until operator/nonoperator and multi-worker recovery tests pass.
- Ensure free-tier database quotas and absence of unexpected charges.
- Fully disable all public lead intake, automated outreach, contract signing, payment acceptance and M&A execution.
- Live test: DB application ping, insert+reload, deduplication, operator 403/200, expiry and rotation, simulated Deal Agent provenance, migration rollback, incident logging.
- Certify before an operator-facing URL is reported. No production activation.

## Current findings
- Neon database real, available and queried.
- Dedicated private staging service not created.
- Genuine OIDC/JWKS verification not implemented.
- No live application-to-Neon connection, no authenticated end-to-end tests.
- No CI result verified for this PR.
