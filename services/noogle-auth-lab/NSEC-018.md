# NSEC-018 — Session model & CI

NSEC-018 adds 15-minute SQLite-backed session **model tests** and a GitHub Actions workflow to verify this lab on pull requests.

This is NOT a production session service or real WebAuthn implementation. The `verified=True` argument is a **trusted-server-side test hook**; it must never be derived from client input or exposed over an HTTP API. It cannot independently establish biometric confirmation, FIDO2 attestation, identity or device trust.

Production requirements: verified WebAuthn assertion with RP ID/origin and challenge checks; fresh owner authentication; CSRF protection; Secure/HttpOnly/SameSite cookies; HTTPS; durable transactions; multi-worker locking; session rotation; revocation propagation; rate limits; device-scoped authorization and security audit.

Remote terminal and live privileged API remain denied. NEO Guardian APK and DNS unchanged. 
