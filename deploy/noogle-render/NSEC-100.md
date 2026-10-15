# NSEC-100: Durable Device Registry Preparation

The SQL migration and database adapter are **inactive** and introduce no new public endpoint or Render environment variable.

Certification required before activation:
1. A dedicated Postgres instance with encrypted backups, restricted network access and a least-privilege registry database role.
2. A verified NEO Pass identity adapter that validates issuer, audience, expiration, replay/revocation, and device-bound proof; no browser-supplied trust flags.
3. A challenge verifier for the device public key, nonce expiry, one-time use, and strict origin/rpId validation before any enrollment.
4. A database transaction and unique constraint for enrollment racing across workers; normalize duplicate-key errors.
5. Role-level isolation and audit logging of enrollment, listing and revocation, plus tested recovery.
6. A security review before allowing enrollment or remote operations. Staging remains a pairing **demonstration**.

No production NEO Pass signing keys, real device enrollments, voting, signing or remote-control permissions are introduced.
