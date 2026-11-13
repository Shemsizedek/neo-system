# NEO-GROK-MCP-006 (isolated staging)

This service provides a protected `/mcp` endpoint to call xAI's Grok API. It is **not** NEO Pass integration or Noogle ADB control. Existing production and Noogle services are unaffected.

## Required Render secrets
- `NEO_MCP_TOKEN` — a long random independently generated MCP client bearer credential.
- `XAI_API_KEY` — private xAI API key from https://console.x.ai/.
- `XAI_MODEL` — model your xAI account supports, initially `grok-4`.

Without `NEO_MCP_TOKEN`, every remote HTTP request is denied (401). Without `XAI_API_KEY`, the tool returns a configuration message and will not call xAI.

## ChatGPT custom MCP connector
- URL: `https://<actual-Render-hostname>/mcp`
- Header key: `Authorization`
- Header value: `Bearer <NEO_MCP_TOKEN>`

The Render URL is not an official public Grok MCP URL; it is an independently hosted gateway.

Do not paste secrets into GitHub, ChatGPT chat, or plaintext logs. NEO Pass connection is currently identity-only; there is no verified token introspection or OAuth resource server integration yet.
