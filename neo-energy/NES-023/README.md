# NES-023 — NEO Utility strict session-validation prototype

Adds a standalone Node.js HS256 JWT validator and adversarial tests for the energy-customer audience. It is **not wired into the existing NEO Pass issuer** and is **not deployed**. The hardcoded secret in tests is purely fabricated.

The existing `server/neo-platform-api/neopass-google-auth.mjs` already issues signed NEO Pass sessions, but its general-purpose verification interface does not require an audience or mandatory expiration. NES Energy must validate both along with `token_use='energy-customer'`; therefore a real energy-specific issuance flow is a prerequisite.

Test locally with `node --test neo-energy/NES-023/test-verify-session.mjs`.

## Production blockers
- Approved issuer changes to mint energy-customer tokens with audience, purpose, expiration and key ID; ensure compatible key rotation and revocation.
- Independent key management and cryptographic review. Prefer a separate asymmetric identity federation contract once issuer capabilities permit.
- Live PostgreSQL transaction-scoped tenant grants and tenant-isolation tests under connection pooling.
- CSRF and session-cookie policies, TLS, anti-replay, observability, retention, account recovery, privacy and incident handling.
- Authenticated staging customer preview with only synthetic data.

This gate neither modifies the existing NEO Pass auth module nor deploys, issues customer tokens, creates real sessions, transfers value, or commands electrical devices.
