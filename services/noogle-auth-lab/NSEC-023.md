# NSEC-023 — Staging release certification gate

## Verified and pending
- GitHub Vercel commit status success on NSEC-022. Vercel checks alone do not establish authentication security.
- Browser adapter fail-closed tests added to CI.
- Python credential tests remain mocks: no physical authenticator end-to-end certification is claimed.
- Actual NEO Pass identity provider is not integrated.
- Credential database atomicity, session establishment, CSRF/session handling, account recovery, and revoked-device enforcement must be implemented and independently tested before allowing sign-in.
- Live device enrollment, remote terminal, phone-as-USB-FIDO2, ChromeOS agent, Guardian APK signing and distribution: **not ready**.

## Mandatory staging gates
1. Confirm DNS ownership and TLS for connect.holytemples.org without disturbing crown.holytemples.org or other services.
2. Create authenticated NEO Pass sessions (no user-supplied verified flags).
3. Run live WebAuthn registration and authentication on actual Android + Chromebook over HTTPS, including replay, CSRF, expired challenge, wrong RP, revoked credential tests.
4. Test secure cookie lifetime and revocation across processes; eliminate registry proof-of-concept boolean trust hooks.
5. Obtain explicit approval before deploying a service or enabling any terminal agent.

No domain mutation, deployment or APK release is performed by NSEC-023.
