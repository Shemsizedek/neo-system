# NSEC-027 durable session proof of concept

Adds SQLite-backed short-lived enrollment sessions with hashed session IDs, hashed CSRF secrets, owner scope, restart persistence and revocation.

The session issue function uses a `proof.validated` **trusted-caller laboratory seam**, NOT independently validated WebAuthn evidence. It is unsafe to bind client JSON or external headers to this object. A real server must construct proof from independently verified NEO Pass authentication with a fresh assertion, then bind session issuance and credential enrollment transactionally.

Not production ready: a standalone SQLite file does not establish multi-replica durability; active session cleanup, audit, rate limits, cookie transport, trusted TLS routing, integration with WebAuthn and NEO Pass identity, and recovery are pending. Remote terminal stays disabled, no APK or DNS modifications.
