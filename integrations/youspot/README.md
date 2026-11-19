# NEO YouSpot Read-Only MCP App — Project 144 Gate 007

## Purpose
This is a custom-app **registration package**, not a deployed proxy, published ChatGPT app, OAuth client, or installed connector. It enables registration of the existing YouSpot remote MCP service, subject to workspace support.

- MCP endpoint: `https://youspot.com/mcp` (Streamable HTTP)
- Protected resource: `https://youspot.com/mcp`
- OAuth issuer: `https://youspot.com`
- Authorization: `https://youspot.com/oauth/authorize`
- Token: `https://youspot.com/oauth/token`
- Dynamic client registration: `https://youspot.com/oauth/register`
- Authorization code with PKCE S256; minimum scope requested: `integrations`

## Critical enforcement boundary
`app.json` expresses an intended **NEO** policy. It does not constrain a direct connection to the YouSpot upstream server. The upstream tool catalog is larger, and OAuth scopes alone do not establish that a tool is read-only. **Do not enable tools/call** until a trusted server-side filtering gateway or equivalent independently verified platform control enforces the exact allowlist (`list_integrations`) for all requests. UI instructions, prompt rules, and metadata are not security boundaries.

## Registration workflow
1. Confirm custom MCP apps are supported in the ChatGPT workspace and permitted by its administrator.
2. Register the YouSpot remote MCP endpoint as a custom app, without uploading credentials to the repository.
3. Inspect OAuth consent and granted token scopes, especially the presence/absence of `write`. Do not authorize broader access for this read-only gate.
4. Connect only through an enforcement mechanism that rejects every `tools/call` name except `list_integrations`, and validate fail-closed behavior; otherwise stop before tool execution.
5. On successful OAuth, call `list_integrations` once and document whether it returns an authenticated account and connected services. OAuth success or a tool list alone is insufficient.
6. Record a negative test at the enforcement boundary for a prohibited mutating call (do not send it to YouSpot).
7. Record actual response status, granted scopes, account linkage, and evidence. Revoke the connection if privilege is broader than requested.

## Test
```sh
node validate.mjs
```
This checks static configuration only. It does not test authentication, transport, or security enforcement.

## Change control
Branch and draft PR only; no production, credentials, spending, or automated outreach. Gate 008 is implementation of an independently authenticated, server-side read-only tool-filtering MCP gateway, followed by controlled OAuth integration tests.
