# NSEC-017 persistent registry laboratory
Implements SQLite-backed, purpose/owner-bound, single-use 120-second challenges and device registry with revoked status. No HTTP endpoints are enabled.

SECURITY: `enroll_verified(..., verified=True)` is a trusted-backend-only interface placeholder, NOT independently established proof. A production WebAuthn library must verify credential signatures, origin, RP ID, user verification and challenge before calling this method. The `reverified` flag is likewise only a placeholder for independently verified fresh authentication. NEVER expose either boolean to client input.

This implementation uses a standalone SQLite connection for local testing, not a multi-worker production persistence architecture. Challenges are bearer secrets, so keep them private and do not log them. Device public keys and IDs must be derived from verified assertions before enrollment. Physical Android attestation and Noogle biometric signing are not integrated. Remote terminal operations remain hard disabled.

Next gate: implement actual server-verified WebAuthn and authenticated sessions with CSRF protection, rate limits and atomic persistence across replicas before real enrollment. No deployment, DNS, APK or privileged access authorized.
