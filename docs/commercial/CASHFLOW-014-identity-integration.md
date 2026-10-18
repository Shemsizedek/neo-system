# CASHFLOW-014 — Staging identity integration

Status: source committed, **not deployed or certified**.

Composition: `authenticated-app.mjs` requires staging enabled, Neon database URL present, production/real customer flows explicitly disabled, configured OIDC issuer/audience/JWKS, and an externally verified private access gateway. The protected lead view delegates signature/claims checks to the OIDC verifier. No caller-supplied identity headers are accepted as verified roles.

Security limitation: `STAGING_ACCESS_PROXY_VERIFIED` is only a deployment assertion, not actual ingress proof. Require external network testing and independent gateway audit before setting it. The OIDC key cache/rotation tests and identity-provider-specific role mapping still need completion; do not accept real users.

Next technical acceptance: select trusted identity provider, wire verified secret-managed Neon credentials, run all tests/CI, test actual application-to-Neon TLS and persistence, verify unsigned/expired/mismatched JWT rejection with real provider JWKS, restart/duplicate/replay and multi-worker tests, evaluate role boundaries. Keep existing public Deal Desk Render proxy untouched.

No production public URL, customer intake, payments, outreach or live M&A execution is enabled.
