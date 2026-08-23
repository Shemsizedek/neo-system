# NEO Tribunal v1.0 Operational Release

This milestone hardens the internal Tribunal records and collaboration platform for multi-user operational use.

## Added in v1.0

- Workspace discovery and switching for authenticated users.
- Server-side session revocation on logout.
- Membership listing and Grand Sheik role administration endpoints.
- Server-backed World Chaplaincy E-File records.
- Persistent notices and hearing records with encrypted envelopes.
- Claim-number docket search.
- Simple request rate limiting for the Node service.
- Structured startup logging.
- Database schema version metadata and indexes for operational records.
- Release readiness indicators in the synchronized operations panel.
- Tests covering the new filing, notice, hearing, workspace and session lifecycle.

## Security and jurisdiction boundary

The backend encrypts stored case, filing, notice and hearing payloads with the configured Tribunal master key and enforces workspace roles server-side. Deployment of this software is an internal institutional records capability. It does not itself create external governmental, police, military, judicial, banking or diplomatic authority.

## Production checklist

1. Set a high-entropy `NEO_TRIBUNAL_MASTER_KEY` through the deployment secret manager.
2. Persist `.data/neo-tribunal.sqlite` on encrypted durable storage.
3. Put the service behind TLS and a trusted reverse proxy.
4. Restrict CORS to approved Tribunal frontends at the proxy layer.
5. Run `npm run build` and `npm test` before release.
6. Run `npm run tribunal:backup` and verify the backup can be restored to a staging instance.
7. Verify `/health` reports version `1.0` and schema `1`.
8. Sign in, discover the intended workspace and verify its audit chain before opening operations.

## Next milestone

v1.1 should add password reset/change flows, stronger rate limiting backed by shared storage, CSRF/origin policy for cookie-based deployment variants, database migration tooling beyond schema version 1, automatic backup restore drills, notice delivery adapters, calendar integration, and administrative reporting.
