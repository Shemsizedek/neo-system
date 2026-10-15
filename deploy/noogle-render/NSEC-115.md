# NSEC-115 — Persistent device enrollment readiness

Adds a non-routed, fail-closed readiness component. This is NOT persistent device registration. Live browser ping sessions on connect.holytemples.org remain temporary and unchanged.

Current verified limitations: production NEO Pass issuer metadata and signing keys are not certified for this Render deployment, no PostgreSQL instance was found in the connected Render workspace, WebAuthn registration verifier is not yet fully implemented, and there is no secure device-to-device data channel.

Do not place signing secrets in the Render service, enable remote terminal, or treat readiness flags as authentication. Next implementation must use a verified issuer, RP origin connect.holytemples.org, strict passkey attestation checks, approved persistent store and recovery model. Data transport must be end-to-end consented and scoped.
