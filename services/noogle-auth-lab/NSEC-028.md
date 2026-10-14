# NSEC-028 — Combined authentication staging harness

This gate exercises session authorization, owner-bound challenge issuance, replay denial, expiry, revocation and terminal denial together. These are **integration tests of local policy components**, not an end-to-end Android/Chromebook passkey test.

Important limitations:
- The `proof.validated` test fixture is a synthetic trusted-server sentinel. Never accept a client-supplied value.
- The harness issues session and challenge in separate stores, not one transaction; production requires durable atomic semantics.
- WebAuthn registration and authentication signatures are not exercised in this integration harness.
- NEO Pass live session integration, HTTPS cookies, CSRF validation from real requests, durable multi-replica storage and biometric confirmation remain pending.
- No Guardian APK, DNS, Nginx, SSH or remote Chromebook agent was modified.

Acceptance for next deployment gate: live origin ownership; authenticated NEO Pass subject; WebAuthn challenge + response on real Android/Chromebook; atomic credential storage; recovery and revocation; audited session and CSRF controls; staging penetration tests.
