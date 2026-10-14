# NSEC-021 — Guardian API / browser integration review gate

This increment delivers a **WSGI preview API**, NOT a production authentication server. Public health and capability probes disclose only preproduction status. All registration, sessions, device records, and terminal requests are explicitly denied.

WSGI entry point: `api_scaffold:application`. Run tests locally with `python -m unittest discover -v` (requires `webauthn>=2,<3` for existing test modules).

Next implementation dependencies:
1. Bind NEO Pass to a verified identity/session provider; never trust arbitrary client user IDs or test-only `verified=True` arguments.
2. Implement HTTPS-bound WebAuthn registration options and verified attestation, store credentials with atomic server-side challenge consumption.
3. Add authentication assertion verification, secure HttpOnly/SameSite cookies, CSRF defenses and rate limits.
4. Test authentic Chromebook and Android sign-in end to end, then stage same-origin Guardian API with DNS/TLS approval.
5. Device agent and remote terminal remain forbidden without separate least-privilege architecture and review.

No deployment, domain routing, APK changes or SSH access are performed by this branch.
