# NEO-CROWN-034 institutional intake preview
This is a static client-facing demonstration, **not an authenticated portal**.
No data is transmitted, persisted, signed, issued, or broadcast. The preview case ID is deliberately non-unique and must never be used as a production identifier.

## Release blockers
1. NEOpass server-side authenticated sessions, tenancy isolation, RBAC, MFA, CSRF, rate-limiting, audit logs.
2. Verified case IDs, encrypted durable storage, retention/consent, evidence uploads with malware scanning.
3. Independent Bitcoin/Counterparty data ingestion, issuer wallet proof, dual control with segregation of duties.
4. Signing and broadcast service isolated behind a server-side, fail-closed authorization boundary. No seed phrase enters this UI.
5. Test all transitions, replay and forged-approval attempts, cross-tenant access, signature validity, hash and metadata tampering, and incident recovery.
6. Confirm NOMNI metadata host serves valid JSON/media and TokenScan actually consumes the issuer's on-chain description pointer.

Run: open index.html locally. It uses no dependencies.
