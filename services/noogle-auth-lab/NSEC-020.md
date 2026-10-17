# NSEC-020 — Guardian WebAuthn enrollment coordinator

Adds a backend-only coordinator that starts owner-scoped enrollment, calls the real WebAuthn verifier adapter and consumes challenges before writing a credential record.

### Limitations
- Not a running API and not connected to the Noogle frontend, Guardian Android APK, or Chromebook.
- The coordinator depends on Registry's single SQLite connection and has no multi-process transaction guarantee or rollback/compensation if device persistence fails after challenge consumption.
- The adapter tests mock verification; they do NOT prove genuine authenticator interoperability or attestation.
- Account authentication is assumed external to this module; no unverified client session is accepted.
- `credential_id` is used as the prototype device ID; production needs separate credentials, devices, ownership and authenticator metadata tables, account recovery, revocation, replay-resistant counter updates and backup eligibility handling.
- **Do not expose** this API until server-side authenticated sessions, CSRF, rate limits, recovery, security audit, atomic persistence, HTTPS and origin checks are tested.
- Remote terminal operations remain disabled. No domain, DNS, APK, production keys or privileged server access changed.

Run locally with dependencies: `pip install 'webauthn>=2,<3'` then `python -m unittest discover -v`.
