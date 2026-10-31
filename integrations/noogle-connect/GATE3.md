# Noogle Connect — Gate 3

31 October 2026 · NEO Suite · Project 144

## Outcome and implementation

Official MCP SDK Streamable HTTP resource-server path built and tested locally.
This is a new isolated staging runtime; no existing NEO service or DNS changes.
Default startup is **locked staging**, with no OAuth issuer, credentials,
device store, login sessions, enrollment or terminal execution attached.

- Runtime dependencies are isolated under `runtime/`, pinned and locked:
  `@modelcontextprotocol/sdk` 1.32.2 and `jose` 6.2.14. Root dependencies unchanged.
- `http.mjs` uses the official SDK transport and request handlers. Authenticated
  requests are verified separately on every HTTP call. No cross-account MCP
  session cache or token passthrough to downstream services is used.
- Configured test/future composition supports exact OAuth resource/issuer
  metadata, Bearer challenges, declared scopes, `devices:read` upgrades and
  sanitized MCP errors. Account identity is derived from verified claims.
- `token-verifier.mjs` checks ES256/RS256 signatures using a trusted key resolver,
  issuer, resource audience, required claims, expiry, a five-minute maximum token
  age/lifetime, scopes at the HTTP/tool boundary and definitive revocation state.
  Token errors and database details are not reflected in responses.
- Host and Origin allowlists, a 64 KiB request cap, request timeouts and a bounded
  per-process request limiter protect this staging surface. These are preliminary
  controls; distributed rate limiting and durable audit remain production work.
- Runtime startup does not read any unlock flag, bearer token, issuer URL or
  database secret. Wiring verified dependencies requires an explicit code change.
- `/healthz` is process liveness, `/readyz` is always 503 until live integration
  certification, and `/mcp` is 503 while locked. Do not equate liveness with a
  working ChatGPT connection or a private network service.

## Validation evidence

`npm ci --prefix integrations/noogle-connect/runtime --ignore-scripts --no-audit --no-fund`

`npm test --prefix integrations/noogle-connect/runtime`

**70 tests passed, 0 failed, 0 skipped**, Node v24.22.1. Includes the prior 63
tests and seven HTTP/authentication integration tests using the official SDK
client and real locally generated signing keys. Keys/tokens are ephemeral test
fixtures; the device store and revocation source are test doubles, not live
provider certification. Two users are checked through the HTTP path; real
database tenant isolation is still unverified.

An inherited JWT negative test replaced the last encoded character, which can
leave the signature bytes unchanged. It now flips a signature byte, making the
tampering test deterministic. No verifier check was weakened.

Gate 2 CI at `a5f71dd316c27b2c99f7e421e5e93f4de8260f02`: all three observed
workflows completed successfully. A dedicated Noogle Connect MCP PR workflow
now installs the isolated locked runtime and runs the entire 70-test suite.
Gate 3 remote CI/deploy results are recorded separately after publication.

## Deployment and integration checklist

Target workspace: Render **NEO SYSTEM**, `tea-dbhtkc8473hc73933img`.
Source: PR #1281 feature branch, a recorded exact commit, auto-deploy off.
Requested compute plan: **free**. No paid fallback, database creation or secrets.
Service creation and live checks must succeed before reporting hosting live.
Current Render documentation confirms that free web-service compute exists;
free hosting does not establish a 24/7 availability guarantee.

| Work | State | Owner / dependency |
| --- | --- | --- |
| SDK HTTP transport and signed-token tests | Implemented locally | Noogle Connect engineering |
| Isolated staging deployment and live denial checks | Verify after publication | Render NEO SYSTEM |
| Live OAuth authorization-code + S256 PKCE, client registration and refresh | Pending | NEO identity / actual provider |
| Approved issuer discovery, key rotation, revocation integration | Pending | NEO identity / NEOpass verification |
| Durable owner-scoped database, audit and failure recovery | Pending | NEO Core database |
| ChatGPT/Codex OAuth linking and user-visible disconnect | Pending | Identity + staging |
| Phone/Chromebook pairing and revocation pilot | Pending | Verified identity + device companion |
| Public plugin review and directory publication | Not submitted | NEOsync publisher |

## Decisions and next milestone

G3-D1: Use the official SDK for remote MCP; keep the dependency-free stdio
prototype as a local development entry point.

G3-D2: The first hosted release is a locked deployment probe. No mock identity
provider or temporary preview pairing can grant access to device records.

G3-D3: Do not advertise OAuth discovery until a verifier is actually composed.
Do not claim PKCE/login has been implemented by a JWT resource-server verifier.

Next: certify an actual issuer and dedicated database, wire them into the HTTP
composition, then exercise ChatGPT and Codex linking with two pilot accounts.
An unknown issuer, unverified revocation source, failed database or missing
scope must deny device reads. Real device enrollment requires additional
WebAuthn/device-bound approval checks, independent of the OAuth connection.

Rollback: keep auto-deploy off; the new staging service can remain locked or be
suspended. Revert this feature branch for source rollback. No production routing,
user records or financial operations are affected.

## Sources checked

- https://developers.openai.com/plugins/build/mcp-server
- https://developers.openai.com/plugins/build/auth
- https://render.com/docs/compute-plans.md
- https://render.com/docs/deploys.md
- https://render.com/docs/health-checks.md
