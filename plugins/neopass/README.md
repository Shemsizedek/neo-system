# NEO Pass ChatGPT plugin — development package

NEO Pass owns account authentication; passkeys remain with the user's authenticator. This package adds a scoped connection from ChatGPT to NEO identity and service-access information. Connecting ChatGPT does not enroll a passkey, migrate an account, assign membership or independently strengthen an existing website session.

## Implemented

- Portable plugin identity manifest.
- Streamable HTTP MCP server factory using pinned MCP SDK 1.32.2.
- Protected-resource discovery at `/.well-known/oauth-protected-resource`.
- `neopass_account`: connected profile ID and display name.
- `neopass_services`: authorized service IDs and names.
- OAuth tool metadata and linking challenges, exact issuer/resource/scope checks, access-token type/expiry/passkey assurance checks and active-account lookup on every tool call.
- Output allowlists: no seed, passkey key material, biometrics, bearer tokens, private records or email in tool results.

`npm ci --prefix plugins/neopass/server --ignore-scripts`
`npm test --prefix plugins/neopass/server`

The server is an explicit factory with mandatory trusted dependencies, not an automatically starting service. Supply `resource` as the final HTTPS `/mcp` URL and `issuer` as the exact NEO Pass origin. `verifyAccessToken` must validate cryptography or opaque-token storage, revocation and token purpose before returning verified identity claims. `isActive`, `readProfile` and `readServices` must use authoritative NEO records. Never supply these from tool arguments or unsigned headers. Return a stable connector-specific profile ID.

## Connection requirements

The current NEO identity issuer remains an identity-only protocol subset: it does not yet bind its access tokens to this MCP resource or grant the plugin scopes. Its existing tokens are deliberately rejected. Implement resource binding throughout authorization and token exchange, consent for `neopass:profile` and `neopass:services`, active token introspection/revocation and an exact registered ChatGPT callback. Use the actual callback from connection setup, not a guessed URL. OAuth registration and durable identity hosting must be verified before connection.

After a verified HTTPS server and OAuth client exist, copy `mcp.json.example` to `mcp.json` and replace both explicit placeholders. The example is intentionally not activated. Configure a public PKCE client with exact callbacks; do not put a client secret in the package. Register and test the MCP connection in ChatGPT before publishing. Public submission is a separate reviewed release.

## Hosting and security boundaries

Render hosts the service; ChatGPT Sites hosts NEO portals. Google is not required by this plugin. Member login and consent occur at NEO Pass. NeoMask remains responsible for local seed-vault unlock and explicit wallet action approval. No wallet actions are exposed. Other NEO sites must separately verify their own sessions and membership; the ChatGPT connector token is not a universal website login token.

No live endpoint, installation, first-account migration, permissions change or production deployment is performed by this package. Production ingress limits, durable authorization storage, recovery/rotation, privacy disclosures and end-to-end account linking remain required.

Official references:
- https://developers.openai.com/plugins/build/auth
- https://developers.openai.com/plugins/build/plugins
