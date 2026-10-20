# NEO Shop MCP bridge — SHOP-011

This is a **separate**, provider-neutral tool endpoint for ChatGPT and other clients; it does not replace Spreadshop or require ChatGPT for storefront operation.

## Run
```bash
export NEO_MCP_BEARER_TOKEN="<long randomly generated secret>"
node apps/neo-shop-mcp/server.mjs
```
Set `PORT` in the hosting environment. Never commit the bearer token to GitHub.

- `GET /health` provides a no-secret liveness response (no private data).
- `POST /mcp` implements a stateless MCP JSON-RPC transport using a bearer token.
- `tools/list`, `tools/call`, `initialize`, `ping` are supported.
- Tools: `neo_shop_status` and `neo_commerce_capabilities`, both read-only.
- No products are fabricated, and no publishing, finance, wallet signing, or DNS modification tools are exposed.

## Deployment gate
1. Test protocol interoperability with a current MCP client and ensure the server meets its HTTP header/transport and auth requirements.
2. Put the service behind TLS and configure authorization with OAuth where the client requires it.
3. Add authenticated product catalog adapters and tenant-specific authorization; never expose customer credentials.
4. Only then register a custom ChatGPT MCP app in an eligible account/workspace. No account linkage is completed by adding this code.

React frontend: `apps/neo-shop-react/index.html`; the production shop subdomain is intentionally unchanged.
