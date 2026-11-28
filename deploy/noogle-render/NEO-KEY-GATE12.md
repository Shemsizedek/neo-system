# Project 144 — NEO Key Gate 12: Tor/Ollama support and live-release decision

**Date:** 2026-11-24  
**PR:** [#1435](https://github.com/Shemsizedek/neo-system/pull/1435)  
**Classification:** isolated development and security-evidence gate, **not an approval to go live**  
**Constraints:** leave production unchanged; no purchases, real account enrollment, Bitcoin transactions, branch merge, deployment, or keys/secret disclosures.

## Executive decision

**NO-GO for public staging or production authentication.** Tor and Ollama can accelerate nonauthoritative code review, private connectivity and lab preparation, but cannot impersonate two independent human approvers, independently review their own output, prove the presence of real FIDO2 secure-element hardware or create a legitimate ChatGPT/Daybreak sign-in integration. WebAuthn browser RP-ID, HTTPS/origin, user-verification and authentic security-device behavior must be demonstrated with the actual target browser and account provider.

### Evidence checked on 2026-11-24

- GitHub `server/neo-router/ollama-provider.mjs` implements a native Ollama `/api/chat` adapter. `providers.mjs` constructs it only if `OLLAMA_BASE_URL` and `OLLAMA_MODEL` are present. This proves source support, **not a reachable Ollama daemon, loaded model or successful live inference**.
- Repository search did not yield a confirmed NEO Tor client or v3 onion-service integration. No live Tor SOCKS proxy, hidden-service hostname, network connectivity or WebAuthn relying party over Tor was verified. Tor claims should remain unverified.
- Read-only connected Render workspaces were inspected. Neither listed a dedicated Ollama or Tor runtime; the older `NEO workspace`'s NEO Core/Noogle staging services are suspended. These inventories do not cover unknown self-hosted machines.
- Read-only Remote Desktop Commander: `penguin` **offline**. Read-only SentinelX: `crown-node-001` **offline**, zero connected hosts. Therefore no USB/NFC FIDO2 hardware scan was possible.
- GitHub PR #1435 is draft and unmerged and has **zero submitted independent reviews**. Reviewer assignment, external key custody records and signed human approvals are missing.
- Last prior Gate 11 CI evidence: 50 security/unit and 7 ephemeral PostgreSQL tests passed. Gate 12 current-head CI must be checked separately.

## Additions in Gate 12

- `neo-key-security/tor-ollama-support.mjs` adds a **pure** Tor v3 hostname format classifier and an Ollama advisory-only integration. It takes only enumerated gate names/status values and does not send arbitrary freeform identity records or secrets to a model.
- The Ollama adapter is injected; without an explicitly configured reachable runtime it returns `UNAVAILABLE` or a fail-closed error. A model's advice is always `GENERATED_UNTRUSTED`. No model output can set `deploymentAuthorized=true`, issue NEOpass tokens, mark independent review complete or enroll/revoke keys.
- A syntactically valid Tor v3 `.onion` address is reported as `V3_HOST_FORMAT_ONLY_NOT_CONNECTED`. It never counts as a successful Tor circuit, browser origin, validated certificate, authenticated tunnel or production-grade endpoint.
- `tor-ollama-support.test.mjs` exercises the actual repository Ollama HTTP adapter through **mock fetch** (no live requests), simulates the model recommending unsafe production release and verifies NO-GO remains unchanged. It rejects passing arbitrary credentials/PII in the model prompt.
- Added test to NEO Key's existing read-only CI workflow. No new npm dependencies, API tokens, deployments or database migrations were introduced.

## Authorized uses

| Component | Safe Gate 12 role | Prohibited authority |
| --- | --- | --- |
| Ollama | Sanitize and summarize public test findings; propose reviewer questions and recovery drills, optionally offline | Signing session JWT, approving first-key enrollment, storing keys, independent human-review sign-off, production GO |
| Tor | Optional private management/test connectivity **after** endpoint and network validation | Replacing TLS, bypassing RP/origin checks, manufacturing FIDO2 assertions, anonymous privileged enrollment |
| Bitcoin / Counterparty | Later integrity anchoring of nonpersonal audit **hashes**, with chain availability independent of login | Storing authenticator secrets/biometric data, guaranteeing identity, authorization or real hardware keys |
| FIDO2 authenticator | Phishing-resistant real browser/WebAuthn key creation and assertion | Replaced by a flash-drive key file, Tor network, AI-generated proof or simulated signing fixture |

## Minimal no-spend path to an eventual staging GO

1. Verify a live **authorized** workstation with attached FIDO2 device(s), and document two **distinct** primary/backup keys privately. Do not treat a generic USB storage drive as a FIDO2 security key.
2. Confirm a reachable **local** Ollama daemon/model on that machine with a non-sensitive, explicit opt-in probe. Keep it localhost or otherwise strongly authenticated; never expose an unauthenticated Ollama API or transmit NEO identity secrets for AI review.
3. If Tor is used, verify Tor daemon/SOCKS or onion service **through the authorized host**, then test its actual DNS, circuit isolation, TLS and browser support. Do not change WebAuthn RP ID or expose admin functions over an unverified `.onion` address.
4. Assign an independent reviewer who is not an author or key custodian. Collect a signed review verdict and resolve critical/high findings.
5. Verify a separate, authoritative human-custody registry and two genuinely distinct operators. Both must be able to sign independent enrollment approvals.
6. Provision a segregated, approved **HTTPS staging** RP with dedicated test-only identities and least-privilege PostgreSQL, migration/rollback and monitoring. Only after explicit approval: test browser registration, sign-in, lost-key backup recovery, revocation and backup restoration.
7. Run `rehearseNeoKeyStagingRelease`; even a complete dossier requires independent release review and explicit owner authorization. Public production rollout and OpenAI/Daybreak account passkeys remain separate provider-controlled processes.

## Exact Gate 12 release blockers

- **HARDWARE**: no connected authorized machine or real FIDO2 primary+backup.
- **REVIEW**: no independent security reviewer submitted a verdict.
- **CUSTODY**: real issuer trust pin and human two-person custody remain unverified.
- **RUNTIME**: Ollama model and Tor process have not been reached or tested; Render inventory cannot establish self-hosted runtime status.
- **ENVIRONMENT**: no approved, isolated HTTPS staging RP and operational database / rollback.
- **AUTHORIZATION**: no independent sign-off; PR remains draft and unmerged.

**Decision: NO-GO.** Keep Tor and Ollama optional advisory/transport components, and complete the verified hardware and independent security gates before public activation. The code in this gate is not mounted to any HTTP route and makes no production or on-chain changes.
