# NES-019 — NEO Pass identity federation and tenant isolation contract

**Implementation status:** prototype access-control logic and draft PostgreSQL RLS; not a production NEO Pass authentication provider.

## Repository inspection
Existing code: `server/neo-platform-api/neopass-google-auth.mjs` issues HS256 NEO Pass sessions; `apps/neo-pads/src/adapters/neopass.ts` implements an independent verification interface. Identity integration is fragmented and must be reviewed before utilities consume sessions.

Noted review items in the inspected token verifier: require token expiry, audience, token purpose, strict issuer pinning, key rotation/revocation strategy, and independent negative tests. Do not assume legacy session identity automatically grants any utility site.

## Boundaries
- Only server-side verified principals may reach `TenantAccess`.
- Grant scope is (subject, tenant, site, permission), with revocation check required in the future persistent implementation.
- `tenant_rls.sql` is not a ready-to-apply production migration; grants and roles must be configured and tested in real PostgreSQL.
- Never obtain tenant/subject context directly from caller-controlled headers, browser storage or query parameters.
- Default deny grid controls, production billing, customer funds, CES and NOMNI bridging.
- No deployment, no live secrets, no identity-provider modifications.

## Next acceptance
Prove signature, issuer, audience, expiry and token purpose verification using real NEO Pass test issuer; adversarial cross-tenant PostgreSQL tests with a non-privileged role; secure audit logging, pooled-connection context reset, and signed reviewer evidence.
