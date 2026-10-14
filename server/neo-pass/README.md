# NEO Pass approval core — Gate 2

Implemented: WebAuthn registration and action assertion verification using @simplewebauthn/server; durable SQLite credentials/challenges; session binding; two-minute expiry; atomic single-use challenge consumption; document and policy version checks; device revocation; unique approval/vote records; pending Crown commitment outbox.

Run `node --test server/neo-pass/approval-service.test.mjs` on Node 24.

This is a server-only library, not an exposed HTTP service or login provider. Supply trusted synchronous authorize, sessionIsActive and resolveResource adapters. These must read authenticated server session, institutional permissions and authoritative document bytes/ballot records, never request-body role/verified flags. resolveResource returns id, institution, version, SHA-256 digest and policyVersion; public ballots additionally return choices, opensAt and closesAt. Private/secret ballots are not supported. Freeze ballot version at opening; votes are unique per subject/action/institution/resource/version. Recorded approvals are individual attestations, not a declaration of quorum or document execution.

Production uses the default SimpleWebAuthn functions. The optional webauthn injection exists for deterministic tests only and must never be configured by clients. Tests simulate successful assertions; malformed registration is rejected by the real verifier. Real device, wrong-origin and wrong-RP cryptographic acceptance/rejection certification remains outstanding.

Registration is enrollment under an existing authenticated identity, not self-asserted signup. Restrict device.enroll with fresh identity/recovery verification. Revocation must invalidate dependent sessions through the NEO Pass session adapter. The library does not issue login sessions or implement recovery.

Deployment prerequisites: exact approved HTTPS origin/RP ID (examples in tests are not deployment approval), authenticated rate-limited endpoint adapter with CSRF/origin checks and body limits, encrypted private durable disk, restricted filesystem permissions, backup/restore validation, retention policy, GISS/Chaplaincy authorization adapters, browser enrollment and real-phone/Chromebook certification. SQLite contents include private approval evidence and are not automatically encrypted by this library.

Crown receipts remain PENDING. A worker must deliver outbox commitments idempotently through a verified Crown adapter and record confirmed receipts before reporting anchoring. No chain transaction, document execution, voting result, PDF signature, wallet signature or live institution record mutation occurs in this gate.
