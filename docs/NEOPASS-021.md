# NEOPASS-021 — ChatGPT plugin foundation

Added plugins/neopass with portable plugin identity, inactive OAuth connection example, dedicated pinned/locked MCP dependencies, and a tested Streamable HTTP MCP server factory. No model API or API key is required by this implementation.

The two read-only tools return an allowlisted connected profile and authorized service names/IDs. Trusted server adapters must validate access tokens and authoritative active membership. Each request enforces exact resource audience, issuer, expiry, token purpose, scopes and passkey-user-verified assurance. Unknown actions and model-supplied account identifiers are rejected. Missing/invalid credentials produce linking metadata. No signing/unlock/enrollment permission is exposed.

Three SDK integration tests pass, covering actual client initialization/tool discovery/calls, protected-resource metadata, anonymous linking challenges, audience/issuer/type/expiry/scope/assurance failures, account revocation, output minimization, spoofed identity/action rejection and foreign-origin rejection.

The existing identity-only issuer is insufficient for the connection: MCP resource binding, dedicated scopes, consent, registered exact ChatGPT callbacks and live authoritative token verification remain required. This is an integration foundation, not a completed OAuth provider or installed plugin. No live service, public submission, credential provisioning, account migration or production permissions changed. The mcp.json.example placeholders must not be submitted as live configuration.

NEO Pass remains the identity authority. ChatGPT linking is scoped delegated access, not an additional authentication factor or a replacement for NEO service session checks. Render and ChatGPT Sites remain the hosting direction; no Google dependency was added.
