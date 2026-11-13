# NEOPASS-023 — request-bound plugin device verification

Live NEO Pass plugin calls confirmed connected=true and passkeyEnrolled=true for the current user. They also confirmed legacyAccountLinked=false and no migrated service grants. No credential was created by the assistant.

Added native Site MCP tools to request a five-minute security check and read its completion. A request is bound to the authenticated Site user and stored only under a hashed opaque ID. The website requires a fresh signed WebAuthn assertion for that exact request, with browser/user binding, required user verification, expiry and one-use ceremony consumption. Existing browser grants cannot approve plugin requests. A check for another user, a different pending request or an expired request does not return verified=true.

Completion is evidence for that specific check only; it is not an access token and grants no wallet unlock, role, service membership or canonical account migration. Existing connection-status tools continue to report ordinary ChatGPT authentication, without implying inherited browser passkey assurance.

Four route integration tests pass, including real signed WebAuthn enrollment/assertion, request-specific completion, user/browser isolation, replay/UV/origin/expiry checks, locking and anonymous/MCP identity rejection. The production build passed. Additive migration creates plugin_checks and adds a nullable request binding to ceremony records; existing credentials are preserved.

Site source commit: 17341d76222e3d401ee878eab5cc3313adaa92e4. Hosting remains ChatGPT Sites, without Render or Google dependencies. Actual completion of a new plugin-generated check still needs the user's authenticator; do not report a successful live check from test fixtures.
