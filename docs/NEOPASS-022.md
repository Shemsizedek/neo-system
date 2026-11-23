# NEOPASS-022 — ChatGPT Sites deployment

The user's current hosting direction is ChatGPT Sites for NEO Pass and its plugin, superseding the earlier Render deployment proposal. No existing Render service was modified or deleted.

A dedicated owner-private NEO Pass Site is published at https://neopass.shemsizedek.chatgpt.site. The supported Sites identity boundary owns browser/plugin authentication. Its MCP capability exposes two read-only tools: connection/passkey enrollment status and cross-service-link readiness. Device WebAuthn enrollment and five-minute browser verification are implemented with durable Sites D1 storage, exact RP/origin binding, required user verification, one-use browser/user-bound challenges, counter checks and a lock action. No Google endpoint or Render backend is used by this Site.

Three route integration tests pass using signed WebAuthn fixtures and a SQLite-backed D1 adapter. Browser preview verified the rendered anonymous page; the live private deployment shows the ChatGPT sign-in gate. Actual personal credential enrollment remains for the user's authenticator. No existing owner credential or account was migrated.

This establishes a Site-scoped ChatGPT connection only. Existing canonical NEO identity, first-account reservation, CounterPay/NeoMask vaults and GISD roles remain unchanged. The UI reports legacyAccountLinked=false. Plugin calls report pluginPasskeyStepUp=false and do not inherit the browser's passkey grant. Full NEO cross-service login remains incomplete.

Native Sites publication reports MCP-ready. Plugin installability/connection must be independently confirmed; do not claim an installed plugin merely from has_mcp=true. Follow the Sites-generated connection, not the prior manually configured Render OAuth example. Backup-key management/recovery and a deliberate domain/account migration remain required before broad rollout.
