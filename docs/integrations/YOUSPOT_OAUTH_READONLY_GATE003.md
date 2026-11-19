# NEO–YOUSPOT–003 — OAuth Read-Only Integration Contract

Status: DESIGN BASELINE — provider catalog and OAuth registration remain unverified.
Branch: feat/neo-youspot-oauth-readonly
Provider MCP endpoint: https://youspot.com/mcp

## Scope

Connect the authenticated YouSpot account to NEO through a dedicated provider adapter in the existing NEO integration architecture. The integration is read-only. It must not create, update, delete, send, publish, enroll, invite, transfer, or otherwise mutate YouSpot data.

## Trust boundaries

1. YouSpot OAuth authorizes the provider connection; it does not define NEO's local permission boundary.
2. NEO enforces a static, reviewed allowlist of exact provider tool identifiers. No inferred or name-pattern-only authorization is permitted.
3. Unknown tools, changed tool schemas, missing classifications, and all write-capable operations fail closed.
4. A read tool is eligible only after its documented semantics and input/output schema have been reviewed. A tool that can trigger side effects is not read-only, even if its name contains "get", "list", or "search".
5. Bind the connection to the authenticated NEOpass subject. Do not accept a subject identifier supplied by an untrusted request body.
6. Keep access and refresh tokens server-side. Never return them to the browser, logs, audit events, error messages, or API responses.
7. Use OAuth authorization code flow with PKCE S256 and validate state, issuer/authorization server metadata, redirect URI, token audience/resource, expiry, and refresh-token rotation according to YouSpot's published protocol.
8. Persist only the minimum connection metadata and encrypted token material required for operation. Support disconnect/revocation and invalidate local credentials on failure or revocation.

## Required provider discovery (blocking)

Before any live OAuth exchange or account-data request:
- Retrieve the live MCP server metadata and complete tool catalog using the documented protocol.
- Record the provider tool name, description, input schema, annotations, and source/version evidence.
- Identify exact read-only candidates by semantic review, not naming heuristics.
- Exclude every mutation-capable, ambiguous, unsupported, and unknown tool.
- Obtain confirmation of the exact allowlist and the OAuth authorization URL/redirect contract.
- Do not request or store credentials in chat.

The user reports being signed in to YouSpot. That does not itself establish that NEO has completed OAuth consent or received a token.

## Required implementation modules

- YouSpot MCP transport/client, isolated from the existing Composio adapter.
- OAuth authorization start/callback with PKCE and one-time state.
- Encrypted token vault integration using the existing NEO secret-management boundary (do not introduce plaintext environment-token persistence).
- NEOpass subject binding and per-subject connection isolation.
- Exact read-tool allowlist checked immediately before provider execution.
- Audit events containing subject, provider, tool identifier, allow/deny decision, timestamp, and outcome; no secrets or sensitive payloads.
- Disconnect/revocation and refresh-rotation handling.

## Test acceptance criteria

- Missing/invalid state, PKCE mismatch, invalid issuer/audience, expired authorization, and token endpoint errors fail closed.
- Credentials and authorization headers are redacted from logs, audit, responses, and thrown errors.
- A subject cannot read another subject's connection.
- Every exact allowlisted read tool passes schema validation and reaches the provider.
- Every non-allowlisted tool, mutation tool, unknown tool, and schema-drifted tool is denied before provider execution.
- Refresh-token rotation atomically replaces the previous refresh token; replayed/invalidated tokens fail closed.
- Disconnect revokes provider credentials when supported and clears local token material.
- Tests use mocked provider endpoints and synthetic credentials; no production account data is used.

## Deployment boundary

- Development and staging only until acceptance tests pass.
- No production OAuth client, production data access, or deployment activation is authorized by this document.
- Do not create a new scheduled parent agent. Any future monitoring belongs under an existing NEO parent agent schedule.
- Do not provision a new Render service until workspace capacity, plan limits, and incremental cost are verified. Do not repurpose Noogle staging without an explicit isolation review.

## Gate exit evidence

Gate 003 may be marked complete only when the live provider catalog and OAuth metadata are captured, the reviewed exact allowlist is committed, implementation and automated tests pass, credential storage is verified, and a staging-only OAuth callback smoke test succeeds without reading or mutating production data.
