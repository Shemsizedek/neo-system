# Noogle Connect — Gate 4: ChatGPT-managed identity

31 October 2026 · NEO Suite · Project 144

User direction: use ChatGPT for OAuth/sign-in.

## Decision and implemented path

Use **Sites-managed ChatGPT sign-in** for the private Noogle Connect companion
and its Site-provisioned MCP plugin. Sites owns authentication and its OAuth
connection; the app authorizes each call using the platform's Site-scoped caller
identity. Do not scaffold an OpenAI login server or accept OpenAI ID tokens as
Noogle device API access tokens.

This adds a managed identity frontend/plugin beside Render. The existing Render
staging service remains locked. It does not trust browser-forwarded identity
headers or gain device-store access from this decision.

## Verified implementation

- A separate private Site was created and published through the owner-private
  publishing operation. Native deployment status: succeeded; MCP capability true.
- Native access readback: current user is owner, custom allowlist contains only
  the owner; a platform-managed authentication client is registered.
- Four read-only tools: overview, caller account status, readiness and platform
  connection guidance. No device actions, financial operations or enrollment.
- Site plugin ID was returned by native connection discovery. Plugin Management
  reports it already installed. Tools have not yet appeared in this conversation;
  installation is not proof that a user has completed a live MCP OAuth call.
- Seven local tests passed: static discovery, mandatory caller identity,
  rejection of account overrides, per-caller identity, honest device readiness,
  API origin/size checks, protected UI and browser JavaScript parsing.
- Build and packaged Worker validation passed; source is synchronized with the
  Site's own repository. Local tests use platform-header doubles and do not
  substitute for an actual signed-in browser or plugin session test.

The private Site and plugin's exact IDs/URLs stay in their private hosting
record rather than this public source document. No user identity, email,
credentials, session token or private device records are stored here.

## Architecture boundaries

Sites Dispatch authenticates browser/MCP callers and supplies the Site-scoped
identity headers. Worker code trusts those headers only at this managed ingress.
There is no alternate public Worker ingress provisioned by this gate. Copying
this Worker to Render without a trusted identity boundary would be unsafe.

Site-scoped IDs differ between Sites. Linking this identity to an existing NEO
account requires a verified linking ceremony, not matching a user-entered email.
ChatGPT sign-in does not grant device pairing, file access, terminal control,
wallet signing or checkout permission. Each capability needs its own later
local consent, scoped authorization and revocation checks.

## Remaining work

| Priority | Item | Owner / dependency |
| --- | --- | --- |
| P0 | Verify account-status tool through installed Site plugin | Signed-in ChatGPT/Codex client; new chat may be required for tool discovery |
| P0 | Persistent device registry and verified NEO identity linking | NEO Core / durable store |
| P1 | Phone + Chromebook pairing and revoke/disconnect pilot | Browser companion / explicit local approval |
| P1 | Trusted Site-to-Render identity exchange if required | Dedicated verified server-to-server contract |
| P2 | Wider sharing and public plugin distribution | Explicit access change and public review |

Standalone Sign in with ChatGPT for external websites/plugins is documented as
limited to selected partners and needs an issued client ID and registered
callbacks. That is a separate path if the Render service later hosts its own
login. No partner registration or approval is claimed by using managed Sites.

Sources checked:
- https://learn.chatgpt.com/docs/extend/mcp
- https://developers.openai.com/siwc/chatgpt-plugin
- https://developers.openai.com/siwc/request-client-id
- Sites identity and MCP contracts provided in the selected environment.

Rollback: keep the Render service locked; the managed companion can be left
private or access removed. No DNS, existing production service or account
records were changed. Do not broaden the Site's audience merely to test login.
