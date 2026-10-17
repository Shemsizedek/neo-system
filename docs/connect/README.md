# NSEC-015 Noogle Connect preview

Target: connect.holytemples.org. Not deployed or configured.

This is a static preview, NOT a working authentication service, remote shell or security key. The browser WebAuthn support check is not credential enrollment. Guardian APK package ID org.neosystem.guardian and signing keys remain untouched.

Backend prerequisites:
- GET /api/guardian/health returns {"service":"neo-guardian","status":"ok"}; this is not authentication.
- Server-generated single-use expiring WebAuthn challenges; verify RP ID connect.holytemples.org, origin, user verification, credentials and counter policy.
- Authenticated, scoped device registry and revocation with audit.
- Secure HttpOnly SameSite sessions and CSRF protection.
- Remote terminal disabled until per-session approval, least-privilege command policy, expiry, disconnect, revocation, audit and independent security testing.

No private keys, biometric samples or SSH secrets in browser storage. Do not expose SSH on a public interface. Deploy only after DNS/TLS ownership, backend, tests and formal approval.