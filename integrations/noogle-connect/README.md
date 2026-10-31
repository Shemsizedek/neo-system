# NEO Suite · Noogle Connect · Plugin Gate 1

[Gate 3: HTTP runtime, authentication tests and staging checklist](./GATE3.md)
adds an isolated official SDK runtime. Run its full suite with
`npm test --prefix integrations/noogle-connect/runtime` after installing with
`npm ci --prefix integrations/noogle-connect/runtime --ignore-scripts`.
Its default startup is locked; it does not yet connect a real user or device.

Status: **local read-only MCP prototype**. [Gate 2 results](./GATE2.md) resolve
the inherited failures and add a non-routed protected read contract.
Not installed in ChatGPT, not deployed,
not submitted, not published, and no user device is connected. No API key,
additional dependencies, database, cloud service or spending is required.

## Try locally with Codex

Requires Node 24 and a checkout of this repository. Replace the example path
with the absolute location of your checkout; do not paste credentials.

```sh
node --test integrations/noogle-connect/*.test.mjs deploy/noogle-render/*.test.mjs
codex mcp add noogle-connect -- node /absolute/path/neo-system/integrations/noogle-connect/stdio.mjs
codex mcp list
```

Ask Codex to call `noogle_connect_overview`, `noogle_connect_readiness`, or
`noogle_connection_guide` with `platform` set to `phone`, `tablet`, `chromebook`,
`desktop`, or `terminal`. Remove the local integration with
`codex mcp remove noogle-connect`.

This minimal stdio transport supports initialization, ping, tool listing and
tool calls. Tests exercise a real child process; official MCP Inspector and
actual Codex/ChatGPT client certification remain pending. It does not provide
HTTP/SSE, OAuth, UI resources, filesystem access, an executor or device agents.
The configuration readiness result is intentionally unconfigured and is not a
network health check. It reuses the existing fail-closed readiness contract.

## Product architecture and device scope

Noogle Connect is the NEO Suite device bridge. Keep it separate from the Noogle
knowledge engine and Omnitrix browser. The target flow is ChatGPT/Codex →
authenticated HTTPS MCP service → account-scoped device registry → a locally
approved browser/native companion. Each connection must belong to the signed-in
user; publication never grants access to another user's devices.

| Device | Planned first capability | Requirement / limit |
| --- | --- | --- |
| Phone | Browser pairing and foreground status | Android/iOS OS permissions; native background agent deferred |
| Tablet | Browser pairing and foreground status | Browser lifecycle and platform permissions |
| Chromebook | Browser companion | Optional Linux agent only where supported and allowed |
| Desktop | Browser companion, then approved local agent | Separate OS install/permissions for files and terminal |
| Terminal | Local Codex MCP, then approved agent sessions | No arbitrary shell exposed by the public service |

These are planned paths, not verified platform support. A ChatGPT plugin does
not itself install agents or give ChatGPT control over hardware. ChatGPT/Codex
client, plan, workspace and platform availability must be checked in the pilot.

## Reuse and gate register — 31 October 2026

Verified source baseline: `c5c493864083b72d0f1f03791cf7d7f573a37705` on
`Shemsizedek/neo-system`. Existing source includes registry, Postgres stores,
WebAuthn verification, action-bound authorization and a terminal-agent contract
under `deploy/noogle-render/`. Device registry currently accepts only `android`
and `chromebook`; expanding its enum alone would not establish other OS support.
Existing NSEC-099/109/120 documents explicitly describe activation prerequisites.
No current Render or production health claim is made by this gate.

| Item | State | Owner / dependency |
| --- | --- | --- |
| Product scope and three read-only MCP tools | Implemented locally | NEO engineering |
| Local protocol/security regression checks | See PR validation | NEO engineering |
| Verified OAuth issuer + PKCE + revocation | Pending | NEO identity / NEOpass interoperability |
| Durable account-isolated registry + audit | Pending integration certification | NEO Core / dedicated database credentials |
| Browser companion and device consent | Pending | Noogle Connect engineering |
| HTTPS MCP staging | Pending | Verify Render NEO System workspace and service first |
| Published listing and public access | Pending | NEOsync publisher identity + OpenAI review |

Decisions: use one MCP service for ChatGPT and Codex; start with read-only
discovery; keep device pairing separate from OAuth linking; keep file transfer,
screen sharing, terminal execution, wallet signing and financial operations in
separate future scopes. No biometric templates, private keys or device identity
records belong on a public blockchain. An optional later audit commitment must
contain no personal or credential material.

## Next gate: private authenticated staging

1. Use the supported MCP SDK HTTP transport for remote deployment. Keep this
   stdio prototype local. Verify hosting access in the Render **NEO System**
   workspace, available service/plan, current deployment and health first.
2. Verify the actual identity provider, then implement OAuth 2.1 authorization
   code + S256 PKCE, protected-resource discovery, audience-bound tokens,
   server-side user identity, expiry, scope and revocation checks. NEOpass
   interoperability is a dependency, not an assumed fact.
3. Add `devices:read` for owner-scoped registry/status. Certify two-user
   isolation, revoked/expired/wrong-audience tokens, device-bound proof and
   unavailable database behavior. Device data stays inaccessible on failure.
4. Pilot one phone and one Chromebook with a short-lived, single-use,
   action-bound pairing challenge approved locally. Do not reuse staging demo
   approval as device authorization. Test denial, expiry, replay and revocation.
5. Validate real ChatGPT and Codex clients, including disconnect. Expand to
   tablets/desktops/terminals only with observed platform evidence.

## Validation evidence

On Node v24.22.1, the five new MCP tests passed. The combined run with existing
Noogle tests finished with **53 tests: 51 passed, 2 failed**. Both failures were
reproduced in a clean worktree at the unchanged baseline commit:

- `postgres-device-store.test.mjs`: the test database double lacks the required
  transaction API (`transactional_database_required`).
- `webauthn-assertion.test.mjs`: the valid signed-assertion case returns `null`
  instead of the expected device-bound identity. Root cause is not established.

These were the Gate 1 baseline results. [Gate 2](./GATE2.md) repairs both issues
and records the current **63/63 passing** run. No official client certification
or live device/hosting test has been completed.

Public release requires a stable HTTPS endpoint, verified publishing identity,
domain verification, accessible website/support/privacy/terms URLs, data
retention/deletion behavior, review test instructions, negative test cases,
and successful OpenAI review. Publish only after approval. Do not upload private
credentials in a submission ZIP.

Rollback: remove the local Codex MCP entry and discard this feature branch.
This gate changes no production service, WordPress page, DNS, auth route or
device enrollment setting.

## Official documentation checked for this gate

- [MCP configuration and plugin connections](https://learn.chatgpt.com/docs/extend/mcp)
- [Authentication](https://developers.openai.com/plugins/build/auth)
- [Plugin submission and public review](https://developers.openai.com/plugins/deploy/submission)

Public availability is a target subject to supported clients, accounts, regions
and review. It is not a promise that every device can run Codex or allow remote control.
