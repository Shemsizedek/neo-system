# NEOPASS-018 — Render-native identity runtime

Hosting direction: Render services and ChatGPT Sites portals. Google/social providers are optional identity integrations, not hosting or storage dependencies. Google Cloud and Firestore are excluded from the new runtime.

Added deploy/neopass-render/server.mjs to compose durable passkey accounts, OIDC-subset routes and login UI. Issuer signing and pairwise keys persist across service restarts, use restricted file permissions and are not silently regenerated on invalid data. Render startup requires the exact persistent mount. Enrollment remains disabled pending the existing first owner's canonical-account migration.

17 targeted tests pass: real WebAuthn registration/assertion cryptography in fixtures, revocation, OIDC code/consent/PKCE exchange, token validation, HTTP protections, ordered page gate, runtime restart key persistence and unsafe configuration rejection.

Live inventory: Render recovery has no NEOpass/Google/project configuration or linked environment group. Existing Noogle database is temporary and expires November 15, 2026. NEO Pads production database is a separate workload; neither database was modified or repurposed.

No service was deployed or upgraded; no paid resources created; no credential enrollment or existing-account import occurred. CounterPay and school login enforcement remain unchanged. Production still requires durable hosting, owner migration, social-provider verification/linking, NeoMask unlock attestation integration, backups/recovery and end-to-end certification.
