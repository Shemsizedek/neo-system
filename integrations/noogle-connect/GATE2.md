# Noogle Connect — Gate 2

31 October 2026 · NEO Suite · Project 144

**Outcome:** Gate 1 is published as a draft source PR. The two inherited test
failures are resolved, and an owner-scoped device-read contract is implemented.
Authenticated hosting and device enrollment remain unactivated.

## Verified work

- [Draft PR #1281](https://github.com/Shemsizedek/neo-system/pull/1281)
  contains the reviewed feature branch; nothing is merged into `main`.
- Node 24 rejects `createPublicKey()` when passed an already-public `KeyObject`.
  The assertion verifier now uses that trusted stored key directly, while
  continuing to parse encoded PEM keys and verify every signature.
- The obsolete PostgreSQL test expected removed `findByKey` / `insert` methods
  and lacked a transactional pool. Tests now cover the actual atomic enrollment
  API, parameterized account predicates, replay/expiry denial, rollback and
  connection release. No database schema or production database changed.
- `device-read-tool.mjs` defines `noogle_list_devices`, requiring verified
  `devices:read` access. Account identity comes from the injected token verifier;
  model arguments cannot select an account. Only device display fields leave
  the adapter. Registry presence is never presented as current online health.
- The protected adapter is deliberately absent from the local stdio tool list
  and the Render public HTTP server. Tests use injected token and store doubles;
  they do not certify a live OAuth issuer or real PostgreSQL isolation.

## Validation

`node --test integrations/noogle-connect/*.test.mjs deploy/noogle-render/*.test.mjs`

**63 tests passed, 0 failed, 0 skipped**, Node v24.22.1. This includes the
subprocess MCP smoke test, valid public-KeyObject and PEM signatures, tampered
signatures, revoked credentials, counter refusal, account selection, missing
scope/token rejection, store failure behavior, and existing public route denial.
`git diff --check` also passed. CI and actual ChatGPT/Codex client certification
are separate checks; these results are local.

## Hosting inventory and remaining dependencies

Render workspace discovery returned both `NEO workspace` and **`NEO SYSTEM`**.
The requested NEO SYSTEM workspace is `tea-dbhtkc8473hc73933img`. Its current
service listing returned nine services and no Noogle Connect service. No new
service was provisioned and no service configuration, deployment, DNS or paid
resource was changed. Existing service names/status are not proof of app health.

| Priority | Next item | Owner / dependency | Status |
| --- | --- | --- | --- |
| P0 | Real OAuth issuer, client registration, PKCE, audience/scope/revocation verification | NEO identity / NEOpass | Unverified; no credentials requested in chat |
| P0 | Dedicated durable store, migrations and owner-isolation integration tests | NEO Core / database | Live validation pending |
| P0 | HTTP MCP transport using supported SDK and protected-resource discovery | Noogle Connect engineering | Not implemented in this prototype |
| P0 | Authenticated staging in the NEO SYSTEM workspace | Hosting / identity | Blocked on preceding verified dependencies |
| P1 | Phone + Chromebook consent pilot and revoke/disconnect checks | Noogle Connect engineering / NEOsync | Pending |
| P1 | Tablet, desktop and terminal companion implementations | Platform engineering | Pending platform-specific implementation |
| P2 | Public listing, website, support, privacy/terms, OpenAI review | NEOsync publisher | Not submitted |

## Decisions and next milestone

G2-D1: Reuse the existing cryptographic and transactional contracts; repair
their actual failures rather than weakening their checks.

G2-D2: Keep protected reads separate from public informational tools until a
real identity verifier and durable store are certified. A mock verifier, a
temporary pairing demo or a configuration flag cannot activate device access.

G2-D3: Do not provision an unauthenticated public endpoint and label it private.
Next milestone is a real authenticated HTTPS staging connection tested from
ChatGPT and Codex, followed by a two-device pilot. This gate closes the local
test blockers; it does not complete that staging milestone.

Rollback: revert the feature branch commits or close the draft PR. Production
has not been modified by this work.
