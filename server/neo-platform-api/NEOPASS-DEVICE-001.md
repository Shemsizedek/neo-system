# NEOPASS-DEVICE-001 — First-party device passkeys

Replace portal Google Identity Services with native WebAuthn enrollment and sign-in. The native startup path has no OAuth, Google Identity SDK, Firestore, or Google account prerequisite. The existing Google authentication HTTP endpoints return 410. Analytics and AdSense are separate services and are not removed by this change.

## Behavior and security

- Browser calls navigator.credentials.create/get against the configured HTTPS origin. The server stores public keys, credential IDs and counters; private keys, PINs and fingerprints never leave the authenticator.
- User verification and discoverable credentials are required. Device-only policy rejects credentials marked multiDevice or backed up by the authenticator. Device-only is a WebAuthn signal, not independent hardware attestation; attestation is deliberately none to avoid device tracking. A compatible single-device authenticator/security key is necessary. Platforms that only create synced passkeys cannot enroll under this policy.
- RP ID equals the exact canonical origin hostname; no parent-domain credential scope or arbitrary return URLs. Google-created passkeys for other RP IDs cannot be reused as NEOpass credentials. Users create a new NEOpass passkey.
- Registration/login challenges expire in five minutes, are bound to a Secure HttpOnly SameSite=Strict __Host cookie and consumed atomically in SQLite transactions. Challenges cannot be replayed across workers using the same database. Single-instance mounted SQLite only; multi-instance/multi-region activation needs a separate shared transactional adapter.
- Origin checks, cross-origin client-data rejection, bounded requests, bounded rate-limit memory, required UV, signature verification and compare-and-update signature counters. Authenticators that legitimately report zero counters remain supported.
- Sessions are eight hours, host-only Secure HttpOnly SameSite=Lax cookies backed by a revocable database session. Logout revokes the session. Second-passkey enrollment requires an existing session authenticated within five minutes; possession of a typed username/email never links existing accounts or confers executive roles.
- New accounts are member/pending. Membership approval, executive authority, wallet access, document signing, remote-device control and Crown signing are not granted by enrollment.
- Manage device passkeys from the dashboard or return to / while signed in. Enroll a second device before losing the first. No automatic recovery or last-key reset is provided.

## Production prerequisites — not yet activated

Current Render recovery service: neo-platform-api-recovery / srv-db8pe7nf3r2c73eum130, NEO workspace. Its observed service plan is free; no mounted persistent disk was established in this task. An ephemeral SQLite path must not be used for enrolled credentials. Existing free noogle-connect-dev PostgreSQL expires 2026-11-15 and is not a production identity-storage solution. Existing NEO Pads production database was not repurposed.

Required environment (values must be configured privately in the service):

```
NEO_PASS_DB_PATH=/var/data/neopass/identity.sqlite
NEO_PASS_STORAGE_DURABLE=true
NEO_PASS_ORIGIN=https://egov.holytemples.org
NEO_PASS_JWT_SECRET=<at-least-32-characters-from-a-secure-generator>
```

The origin above is a candidate, not a verified final routing decision. Verify the chosen canonical NEOpass hostname, current Render routing, HTTPS and WordPress links before enrolling anyone. Host-only cookies cannot authenticate another hostname automatically. No shared-domain cookie or cross-service SSO is claimed. A separately reviewed authorization-code bridge is needed for other applications.

1. Provision/verify a mounted durable volume, restrictive permissions and encrypted backup/restore. Confirm cost/plan before any paid provisioning. No infrastructure was purchased by this gate.
2. Pin/review this change and configure the canonical origin and existing or independently provisioned session secret privately. Preserve the prior release for rollback. Do not overwrite an existing signing secret casually.
3. Verify that the exact origin reaches this native runtime; /api/v1/auth/passkeys/status must report configured:true. Anonymous protected routes must remain denied. Run a real-device enrollment/sign-in/restart test and restore test with a nonprivileged test account.
4. Migrate existing verified accounts using independently authenticated ownership evidence. Do not map typed email/username or a newly registered passkey onto existing Google subjects. No existing Google identities, privileges or passwords were migrated by this gate.
5. Update the portal and WordPress login links to the certified canonical NEOpass origin. Disable Site Kit's Sign in with Google module only after the replacement WordPress session/SSO flow is verified. This PR does not implement a WordPress account/session bridge.

Missing configuration yields configured:false and rejects enrollment with 503; it never silently falls back to Google, memory storage or an unauthenticated member dashboard. This is deliberate and must not be described as a live functional passkey deployment.

## Validation

Real cryptographic test fixtures exercise none-attestation registration and ECDSA assertions, wrong origin/challenge/RP hash, UV, cloud-backup rejection, tampered signature, account binding, challenge replay races, counter rollback, expiry, logout revocation, second-device enrollment and durable reopen. HTTP tests cover cookie binding, strict origins, retired Google routes and the native portal UI. Validation: root suite 883 passed, 1 skipped, 0 failed; production build passed. Three additional boundary tests were then added and the final passkey suite passed all 12 tests. Final diff whitespace check passed. No live registration or account migration was performed.
