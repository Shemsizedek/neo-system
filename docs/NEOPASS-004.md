# NEOPASS-004 — Durable wallet ownership challenges

Adds an optional SQLite challenge store to the isolated NEOpass ownership proof service. Challenges persist through restart. A parameterized UPDATE with RETURNING binds challenge ID, subject, session, origin, expiry and unused state in one atomic operation before invoking the signature adapter. Closed/unavailable storage rejects verification. The default in-memory sandbox remains for compatibility; production callers must explicitly supply durable storage.

## Validation

All 71 tests pass: node --test server/neo-tokenworks/*.test.mjs deploy/noogle-render/*.test.mjs.

Six new tests use real temporary SQLite files to verify restart persistence, two-connection replay rejection, account/session/origin isolation, expiry and cleanup, database failure, and configuration validation. Bitcoin signatures remain mocked; this gate does not certify cryptographic wallet ownership.

## Deployment requirements

- Node 24 node:sqlite runtime; storage opens only when the factory is called.
- Single host with a persistent local disk. Do not use ephemeral Render disk or network-shared SQLite for production. Multiple hosts require a shared transactional database adapter.
- Restrict database/directory permissions to the service identity; database records contain member/session associations and public wallet addresses. Define retention, backups and scheduled expiry cleanup before production use.
- No Render service, disk, environment variable or HTTP route was created or changed.

## Remaining gates

Reviewed Bitcoin signature adapter and real wallet interoperability; authenticated server routes; persistent verified-wallet bindings and revocation; passkey enrollment/recovery and signed-in device testing. Challenge persistence is not a completed identity registry. No assets are moved, escrowed or signed.
