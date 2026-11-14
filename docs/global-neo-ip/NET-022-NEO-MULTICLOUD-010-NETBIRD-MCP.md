# NEO-MULTICLOUD-010 — Official NetBird MCP, read-only peer inventory

Status: OFFICIAL ENDPOINT VERIFIED / AUTHORIZATION NOT COMPLETED / NO LIVE NETBIRD PEER INVENTORY
Reviewed: 2026-11-14 America/Chicago
Code lane: existing draft PR #1426; no production changes or application install.

## What changed

NetBird introduced an **official remote MCP management endpoint** for NetBird Cloud:

    https://api.netbird.io/api/mcp

Official documentation updated November 12, 2026:
- https://docs.netbird.io/manage/mcp-server
- https://docs.netbird.io/manage/mcp-server/connect-clients

NetBird's endpoint is a streamable HTTP MCP server with dynamic OAuth. NetBird documents a **read-only access scope mcp:read** and a user-facing read-only vs write consent control. OAuth is preferable to personal access tokens because no API secret is copied or stored in the NEO repository, CI or chat.

The NetBird MCP server exposes read-only operations such as list_peers, get_peer, list_groups, list_policies, list_audit_events, and other inventory functions, as permitted by the authenticated user's role and access grant. It also exposes mutation tools, but **read-only OAuth authorization prevents those mutations**. Their existence does not grant NEO authority to perform them.

## Human-controlled connection methods

### Option A: Existing user Codespaces VS Code / Copilot

From the Codespaces VS Code Command Palette, choose `MCP: Add Server`, select **HTTP**, enter the official URL, and register the server ID `netbird`. Save in a personal/user scope rather than modifying the repository's shared editor settings or `.mcp.json`. Authenticate through NetBird OAuth and choose **Read your NetBird configuration**, leaving **Make changes** unchecked. Inspect the target/redirect host before granting consent.

Official VS Code instructions: https://docs.netbird.io/manage/mcp-server/connect-clients#vs-code

Note: this enrolls the **agent's MCP management integration**, not the Codespace as a WireGuard peer. The rootless Docker pilot remains a distinct manual step under NET-020/021. The Codespaces browser/CLI may or may not expose the command; report unavailable as unavailable, never invent success.

### Option B: Codex CLI Linux

On an operator-owned Linux development session with Codex CLI installed:

    codex mcp add netbird --url "https://api.netbird.io/api/mcp"
    codex mcp login netbird --scopes mcp:read

Complete the OAuth consent in the browser if prompted. Do not choose Make changes. Do not use or paste any NetBird setup key or personal access token. The configuration is user-local at `~/.codex/config.toml`; no repo changes needed. This MCP connection does not automatically create a persistent VPN machine.

Official Codex instructions: https://docs.netbird.io/manage/mcp-server/connect-clients#codex

### Option C: ChatGPT workspace, when available and authorized

Open ChatGPT on the **web**, use Plugins → Add custom MCP server, give it the NetBird endpoint above, use OAuth and select read-only. Current OpenAI documentation says custom MCP server connections are available to **Business and Enterprise/Edu** workspaces under owner/admin or delegated permissions. Other accounts may not have this setting; do not claim it is installed on an unsupported plan, and do not conflate active ChatGPT Work with a connected NetBird account.

Official OpenAI guidance: https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt

## Work-mode evidence and access boundary

At this review, the available connected ChatGPT tool list does **not** include NetBird MCP tools. Plugin Directory discovery for NetBird returned zero matching plugins. The available Browser connector returned an originating-browser-context error, so the assistant cannot navigate the user's open Codespaces tab or type commands inside it from this session. GitHub and SentinelX read-only tools remain available: latest SentinelX inventory still has zero connected hosts; `crown-node-001` offline. This is not NetBird's peer inventory.

In particular:
- Android NetBird app showed Connected by the user's screenshot.
- Codespace preflight showed Docker available, TUN present, no CAP_NET_ADMIN; valid candidate for rootless pilot only.
- A live rootless NetBird container, second peer, authenticated NetBird dashboard list, and Android-to-Codespace transaction have **not** been independently seen.
- A successful GitHub CI run validates staging source but does not prove NetBird authentication or private transport.

## First review-only inventory after OAuth sign-in

Request the following **read-only** NetBird MCP operations, without changing any account objects:
1. `list_peers` — count approved peers, note only **sanitized device categories and connection states**. Is the temporary Codespace peer present/connected? Do not copy peer names, public keys, private overlay IPs, or management addresses into the public PR.
2. `list_groups` and `list_policies` — confirm the pilot peers belong to an explicitly restricted allow group and the default all-to-all policy posture. Read-only, do not update groups or policies.
3. `list_audit_events` — preserve a sanitized timestamp/evidence class for any enrollment or policy changes. Never confuse a peer registration event with an actual WireGuard handshake.
4. On the actual peer host, use `netbird status --detail` and the NEO local observer from NET-017 to confirm **a recent handshake for the exact Android peer**, then run the HTTP response test from NET-021.
5. For a permitted private request, record only the redacted response PASS/FAIL and UTC observation time, plus separately observed connection type. No chat secrets or private endpoint dumps.

If any action asks for create/update/delete, **decline and require separate explicit owner approval**. With OAuth choose read-only, and reject any request to switch to broad full-access PAT for convenience. NetBird warns that `update_*` tools replace complete objects and can inadvertently remove group members or access rules if fields are omitted.

## Acceptance

| Requirement | Status |
| --- | --- |
| Official remote NetBird MCP endpoint verified | VERIFIED OFFICIAL DOCUMENTATION |
| NetBird MCP installed in this ChatGPT Work session | NOT AVAILABLE |
| NetBird read-only OAuth authorized on user client | NOT VERIFIED |
| NetBird management live list_peers | NOT EXECUTED |
| Codespace rootless VPN client enrolled | UNKNOWN |
| Android NetBird Connected | USER-SUPPLIED SCREENSHOT |
| Independent peer handshake | NOT VERIFIED |
| Android-to-Codespace private application request | NOT VERIFIED |
| Narrow guest policy and revocation | NOT VERIFIED |
| Production routing, private 10.144 network, WAN failover | NOT APPROVED |

Gate result: OFFICIAL_MCP_ENDPOINT_QUALIFIED / HOLD_OAUTH_AND_REAL_PEER_EVIDENCE.

The NEO-SYNC control plane can use native NetBird MCP for status and policy audits after authorized connection. The data plane still needs an authenticated second NetBird client and demonstrated encrypted traffic. No network, billing, key, device, hosted service or production change was carried out as part of this documentation gate.
