# NEO Muse MCP staging gateway

A restricted, zero-dependency MCP Streamable HTTP JSON-RPC endpoint. **Read-only static diagnostics only**: no linked GitHub API credentials, production NEO services, databases, or financial records. Do not interpret metadata responses as live access to named systems.

- GET /health: public service readiness (no tokens).
- POST /mcp: Bearer authentication using NEO_MUSE_MCP_TOKEN; supports initialize, ping, tools/list, tools/call and initialized notification. Responses use application/json.
- GET /mcp: 405 (SSE not supported).
- Tools: neo_gateway_status, neo_repository_info.

## Deploy
Render Node runtime, build command: node --check services/neo-muse-mcp/server.mjs
Start command: node services/neo-muse-mcp/server.mjs
PORT provided by Render. Set NEO_MUSE_MCP_TOKEN to a high-entropy secret only in Render environment settings, never in Git. Disable auto-deploy. Configure custom DNS only after authenticated staging acceptance. This is a static-key staging phase; OAuth is **not** implemented.

## Authorization
Token required on every /mcp request, including initialization. All tools read-only. Endpoint accepts no arbitrary target URLs and makes no external calls. Rotate/revoke token via Render settings.

## Test
curl -i https://<assigned-render-host>/health

curl -i -X POST https://<assigned-render-host>/mcp -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -H 'Authorization: Bearer <secret>' --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}'

## Limitations
Not a GitHub connector, not an OAuth resource server, not a general-purpose NEO gateway. Muse compatibility requires a real client handshake and confirmation Muse accepts static bearer-token access.
