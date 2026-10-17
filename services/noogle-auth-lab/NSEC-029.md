# NSEC-029 — Read-only authenticated identity gateway

An **unbound** Node HTTP handler `guardian-gateway.mjs` reuses existing NEO Pass token verification to expose a read-only authenticated subject check for staging. It does not launch a server, mint tokens, authorize registration, or expose shell operations.

Security properties: bearer tokens are accepted only via Authorization headers; privileged scoped tokens rejected; all registration and terminal paths fail closed; responses do not cache session details.

This is NOT a deployable production authentication endpoint: no TLS proxy/trust configuration, distributed session revocation, rate limiting, authorized account lookup, refresh/replay protection, strong browser session cookies, or CSRF policies. In particular, the GET /session endpoint must not be used as proof of recent biometric authentication or privilege. Host its behavior behind authenticated infrastructure only after security review.

Tests use local loopback Node HTTP servers and synthetic signed NEO Pass tokens. Run: `node --test services/noogle-auth-lab/guardian-gateway.test.mjs`.
Production Android/Chromebook passkey trials remain pending. No remote terminal, APK or DNS changes.
