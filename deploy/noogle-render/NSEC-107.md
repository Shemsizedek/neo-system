# NSEC-107 Credential integrity and recovery

Inactive schema/adapter change only. Public device enrollment remains disabled.

- Both public-key and credential-ID hashes now originate from the server-private verified proof, never a supplied HTTP hash.
- The unique credential-ID hash index prevents one credential identifier from being concurrently enrolled across accounts. Production migration must backfill and audit existing data, then enforce not-null after verification.
- PostgreSQL transactions roll back consumed challenges and inserted records together on SQL failures. The in-memory proof capability itself cannot be rolled back; failed attempts require a **fresh** verified WebAuthn ceremony.
- A production-grade challenge verifier, NEO Pass identity mapping, durable device metadata, incident audit logs and cross-worker race tests are still mandatory.
- No routes, tokens, databases, enrollment, terminal access, signing or voting are activated.
