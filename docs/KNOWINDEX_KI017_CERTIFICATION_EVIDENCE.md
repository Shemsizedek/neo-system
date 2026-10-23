# KI-017 — Production identity, PostgreSQL privileges and recovery evidence

## Gate posture: BLOCKED on real production identity and dedicated storage

Date evaluated: October 23, 2026. This is a read-only engineering gate, **not live KNOWINDEX knowledge-write authorization**.

### Verified runtime

- Render NEO Platform API recovery service is reachable; anonymous KNOWINDEX contribution requests return HTTP 503 with writesEnabled false. The /api/v1/platforms endpoint returns HTTP 200.
- Public Noogle index returns HTTP 200 and contains the approved single World Library landing-page record. User contributions are not automatically indexed.
- KI-015 disposable Postgres successfully backed up and restored 7 records, 11 audit events, a withdrawal and an intact audit hash chain in CI. It does not prove a live database's off-host backup schedule.
- KI-016 ignores signed JWT role/email bootstrap claims, reads current active NEOpass registry records and independently allowlists curators. Tests passed.

### Historical Google Cloud audits (October 15, 2026)

- [Signing source discovery](https://github.com/Shemsizedek/neo-system/actions/runs/38673967504) succeeded, finding Cloud Run Secret Manager references without accessing key values.
- [NEOpass binding preflight](https://github.com/Shemsizedek/neo-system/actions/runs/38675043334) succeeded, identifying a GISS service signing-secret reference and existing secret resource.
- [NEOpass runtime IAM authorization audit](https://github.com/Shemsizedek/neo-system/actions/runs/38724274449) **failed**: a Secret Manager IAM policy check returned PERMISSION_DENIED and stated that Google Cloud billing must be enabled. That audit did not establish actual secret access for the runtime.

These older checks are not current live-token, role, or IAM certification. The newer [KI-016 manual protected metadata workflow](https://github.com/Shemsizedek/neo-system/blob/main/.github/workflows/ki016-gcp-neopass-metadata-audit.yml) was prepared but has not been dispatched.

### Render database inventory (read-only)

- noogle-connect-dev: free development PostgreSQL expires November 15, 2026. Must not be repurposed.
- neo-pads-production: belongs to another product and must remain isolated.
- No separately authorized persistent KNOWINDEX production database is present in the connected Render workspace.

## New runtime database security audit

The Postgres adapter method inspectRuntimeSecurity() performs read-only catalog queries to verify non-superuser role, no database or schema creation, precise contribution read/insert/update rights, no audit mutation or trigger privileges, no audit-table owner membership, active append-only triggers and valid event-chain integrity. It also refuses to call known dev/test/shared database names production-eligible.

Only Boolean checks and event counts are returned; database names, role identities, credentials and contribution details are not returned. The result explicitly marks real off-host backup, live identity and real production restore as UNVERIFIED; grant inspection is not an operator approval or backup proof.

The isolated PostgreSQL test verifies the restricted CI runtime passes least-privilege checks, the migration owner fails, test databases are not production eligible, and disabled triggers or corrupted audit data fail closed.

## KI-017 acceptance and stop rules

1. Resolve GCP IAM/billing access only with explicit approval; then run the protected production metadata audit on reviewed main. Never expose signing keys, principals, OAuth client IDs or session tokens.
2. Independently verify an actual consenting active NEOpass contributor and separate approved curator, including provider binding, role revocation and expired or forged token rejection. No fabricated identities are acceptable for production certification.
3. Authorize an isolated production KNOWINDEX PostgreSQL instance with least-privilege runtime role, automated off-host backup and separate-environment restore; do not reuse other workstreams' databases.
4. Verify backup head/hash continuity, operational ownership, RPO/RTO, emergency disable and rollback. Store independent audit checkpoints.
5. Only after these gates pass, separately authorize a reversible single-contribution live pilot and ensure that review approval does not silently publish a record into public Noogle.

**No billing activation, new spending, data-store modifications, identity changes, live writes, third-party copying, token transfers or NEO Crown Chain signing occurred during this gate.** Follow-up issue: #1177.
