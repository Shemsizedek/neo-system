# NSEC-016 — Guardian authentication gate (preproduction)

This gate adds **state-machine laboratory code only**. It deliberately does NOT register or authenticate passkeys, assert device identity, perform hardware attestation, or provide a remote shell.

## Protocol to implement next
- Canonical RP ID: `connect.holytemples.org`, contingent on verified HTTPS origin. Never trust user-supplied origins.
- Registration: authenticated user -> generate CSPRNG challenge -> verify clientDataJSON challenge/type/origin, authenticatorData RP ID hash, user verification policy, public-key and attestation rules -> atomically store credential ID and verified public key.
- Authentication: issue scoped challenge -> verify WebAuthn assertion signature, challenge/type/origin, RP ID hash, user presence/verification and counter/backup-state policy -> rotate Secure HttpOnly SameSite session.
- Pending challenges expire within 120 seconds, are single-use and are bound to user and purpose. Production use MUST persist state and atomically consume across replicas.
- Revocation: fresh user verification, owner-scoped authorization, immutable audit and immediate enforcement on subsequent requests.
- Browser-to-server: CSRF defenses, HTTPS only, authorization checks on every endpoint, rate limits and structured audit.
- Device agent: **not yet deployed**. Outbound-only connection; remote shell prohibited until approved allowlist, per-command consent, bounded duration, isolation, authentication and security review.

## Test locally
From this directory: `python3 -m unittest -v test_challenge_state.py`

The challenge-state tests are NOT security certification. No DNS/hosting, Android APK, and existing Guardian services are modified by this commit.
