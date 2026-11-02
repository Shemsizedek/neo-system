# NEO-PRESS-007 — NEOpass revocation, concurrent custody integrity and independent audit

**State:** Draft code only. No production deployment, portal launch, token issuance, real evidence import, DNS change or external witness publication.

## Official name

The product is **NEOpass**. Maintain that exact capitalization in all public-facing text and project documentation. Legacy technical identifiers such as window.NeoPass, neopass-session, imports and environment variables are compatibility interfaces, not product branding: do not rename without coordinated migrations.

## Read-only service inspection

The connected Render account exposed two workspaces, **NEO workspace** and **NEO SYSTEM**, on 2026-11-02. A read-only listing found Noogle Connect staging web services (including noogle-connect-staging and noogle-connect-mcp-staging), but **no service named for the NEO Press newsroom**. The visible listings do not validate a production press issuer, role registry, or dedicated encrypted press volume. This is not proof that no external deployment exists; these are only the services visible to the connected workspaces. Neither workspace was modified.

## Implemented code

- security-policy.mjs: explicit PRODUCTION security policy requires an injected distributed limiter (never local in-memory), NEOpass issuer health verification, and separate token and subject revocation checks. Missing, unhealthy, or unavailable dependencies fail closed; default local test mode has no production privileges.
- http.mjs: production mode is denied unless the security policy is present and configured. Both unscoped NEOpass session exchange and all audience-scoped press routes check the security policy; the exchange performs a second subject revocation check after validating signed token identity and before issuing the five-minute newsroom token. Client-supplied X-Forwarded-For is not trusted.
- custody-store.mjs: essential duplicate-review, original-media-link and correction/post-correction decision preconditions are checked within SQLite BEGIN IMMEDIATE transactions. This prevents parallel writers using distinct SQLite connections from bypassing stale external prechecks, subject to the mandatory single authoritative encrypted database deployment.
- audit-verifier.mjs: recomputes current local custody integrity, validates a signed Ed25519 checkpoint against a trusted external key, and independently retrieves and checks a separately signed witness acknowledgement. Any subsequent ledger mutation invalidates the old checkpoint. A retrieved signed witness record is not proof of public immutability, blockchain anchoring or source truth.
- security-gate.test.mjs: tests production guard denial, NEOpass revoked token/subject, limiter exhaustion, proxy-header spoof attempts, concurrent editorial contention, checkpoint staleness, and no automatic publication.
- Corrects the misspelled NEopass branding in the Gate 005 and 006 documentation while retaining compatible code symbols.

## Unresolved release controls

1. Review and reconcile the stacked PR dependency chain #1304 → #1305 → #1306 → #1307 → #1308 → #1309 → this gate.
2. Resolve existing main-repository GISS test and NEO Services inventory drift without suppressing either validation.
3. Provision an independently audited authoritative NEOpass role and revocation registry and bind it to the press-only service. Stubbed adapters in the tests are not live services.
4. Provision dedicated press-only Render/other runtime by separate explicit authorization. Require TLS, trusted host/proxy, encrypted SQLite volume, isolated original-media storage, production KMS, backup drills and rate-limiter persistence/shared coordination.
5. Obtain actual off-site signed witness receipt and independently inspect the source evidence. Signing by an in-process test key is not an external anchor.
6. Validate non-GET browser origin restrictions, same-site security, network proxy behavior, request-body size caps, audit logs, time drift, brute-force protection and load.
7. Perform legal/privacy security review, source-protection and retention policies, consent management and access revocation under the actual operating jurisdictions.
8. Require separate authorization to deploy, ingest a real credential, publish, or contact external sources.

**Release decision:** BLOCKED until independent service, security, source, legal, and CI evidence exists. Passing a test suite does not certify production.

**Next Gate — NEO-PRESS-008:** production candidate deployment plan, signed off-site custody evidence retrieval, real NEOpass issuer integration and verified encrypted-store disaster recovery with explicit operator approval. No production state change is authorized by this draft.
