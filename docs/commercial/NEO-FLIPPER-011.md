# NEO-FLIP-011 — Restricted-Neon HTTP Integration Runner

**Principal:** Shelton Estate & Co. **Parent:** NEO Deal Desk / NIA-013.  
**Date:** November 21, 2026. **Mode:** scratch-only, synthetic evidence. PR #1443 stays draft and unmerged.

## Verified existing live infrastructure
- Neon project `mute-rice-57396659`, parent branch `br-old-violet-ar9cr5mw`, separate scratch branch `br-holy-lab-ar0at3wz`.
- Read-only Neon endpoint inspection returned scratch compute `ep-silent-dream-arc4371g.c-4.us-west-2.aws.neon.tech`.
- Restricted scratch user `neo_flipper_gate9_app` successfully authenticated through the Neon connector; read-only counts: 2 buyers, 2 listings, 2 previews, including earlier synthetic rehearsals.
- The scratch login cannot DELETE buyer/audit records or read private parent Deal Desk opportunities.
- Render workspace inventory: no separately verified NEO Flipper deployment. Existing NEO Deal Desk service observed, but not modified.

## Gate 11 additions

### Scratch database URL validation
`server/neo-flipper/staging/gate11-config.mjs` requires an exact endpoint hostname, `neo_deal_desk_staging` database, `neo_flipper_gate9_app` user, password and TLS. It rejects owner credentials, unexpected hosts, disabled SSL and unexpected connection URL options. The validator returns only non-secret identity facts. It does **not** generate a credential, provide independent chain-of-trust to a real NEOpass issuer or authorize production deployment.

### Runnable scratch-only HTTP/Postgres smoke script
`server/neo-flipper/staging/gate11-http-pg-smoke.mjs` is an opt-in integration executable. It imports `pg` only when manually run, uses the real Gate 9 scratch runtime, binds an ephemeral HTTP server to **127.0.0.1**, makes test-signed JWT requests, and uses the supplied restricted PostgreSQL connection pool.

Planned assertions on an actual run:
1. Rejected invalid signature.
2. Synthetic buyer HTTP insert and idempotent replay.
3. Conflicting replay returns HTTP 409.
4. Synthetic listing insert.
5. Research-only preview persisted with zero recognized revenue.
6. Buyer suppression and post-opt-out absence.
7. Session revocation rejected.
8. Real PostgreSQL counts and opt-out status from the restricted identity.

Randomized fixture IDs begin with `B-GATE9...` and `LIST-GATE9...`, use `fixture:` attestations and the allowed `example.org` fake listing URL. No real buyer, property, payment, e-signature or outreach is involved.

### CI
- `server/neo-flipper/staging/gate11-config.test.mjs`: offline connection validation tests, with dummy passwords.
- `.github/workflows/neo-flipper-tests.yml`: now includes `server/neo-flipper/staging/*.test.mjs` and nested module syntax checks.
- Latest exact GitHub Actions run must be inspected before declaring tests passing. **These tests do not execute the real PostgreSQL smoke runner**.

## Manual operator invocation (requires secure local runtime)
Only on an authorized isolated operator workstation or protected stage-only runner, install the reviewed `pg` driver in that environment, obtain a scratch-only restricted connection string in a **secure secret manager**, and set the required environment variables without printing the secret. Then run:

`NEO_FLIPPER_GATE11_RUN=scratch-only node server/neo-flipper/staging/gate11-http-pg-smoke.mjs`

The runner reads `NEO_FLIPPER_SCRATCH_DATABASE_URL` from environment. Never paste this value into GitHub, ChatGPT replies, Actions logs, command history, or public files. Never use an owner/admin connection string. The test module does not contain credentials and will fail closed with `scratch_connection_missing` or `pg_driver_not_installed` if prerequisites are absent.

## Critical verified-vs-unverified boundary
- **Verified:** restricted-role SQL test against Neon (Gate 9), HTTP loopback flow against in-process synthetic store (Gate 10), scratch compute endpoint inventory and branch configuration.
- **Implemented, not exercised end-to-end:** Gate 11 HTTP-to-real-Postgres smoke runner. Cannot declare full integration operational until a safe stage-only runner actually invokes it and independently validates SQL evidence under the restricted identity.
- **Unconnected:** real NEOpass issuer and current-role/revocation provider; real approved buyer data, permissioned listing/comp provider, approved closing documents, protected production app, signing/escrow and money receipt adapters.

## Next milestone — NEO-FLIP-012
Execute the scratch-only HTTP-to-Postgres runner under secure secret injection, then test a real backup-restore branch, concurrent idempotency, credential revocation and rate limiting. Review with counsel before any buyer/seller outreach. No automatic merge, production writes, paid service, or escrow activity.
