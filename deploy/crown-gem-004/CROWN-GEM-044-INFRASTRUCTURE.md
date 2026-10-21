# CROWN-GEM-044 — Isolated Security Infrastructure Decision

**Decision: staging continues; production promotion BLOCKED.**

## Observed Render inventory
- neo-crown-gem-staging: free Python web service, Virginia; manual deploys; publicly reachable ingress and application bearer authentication.
- Key Value instances: none in this workspace.
- PostgreSQL instances belong to other projects: noogle-connect-dev (free, expiring November 15, 2026) and neo-pads-production (paid). **Do not reuse either.**
- No dedicated Crown shared security data store is configured.
- No verified outbound firewall, network policy, or proxy enforcing an egress allowlist.

## Architecture

Client -> authenticated ingress / gateway -> quota service -> read-only Crown routes
                                                |
                                                +-> append-only security audit sink
Crown routes -> policy-enforced outbound proxy / egress firewall -> Bitcoin / Counterparty API

**Separation:** retail-facing API, Gemini developer runtime, private Crown attestation backend, and all wallet / treasury systems have distinct credentials and privileges. The gateway never receives wallet signing keys.

### Rate limiting

Production requires atomic shared counters (e.g. Redis-compatible Key Value) across workers and instances, with principal-based quotas after auth, IP-based pre-auth abuse protection, and trusted proxy handling. Fail closed on quota-store unavailability for expensive authenticated routes. Centralize ingress throttling for anonymous abuse. In-memory 30/min/client rate limiting remains staging-only, not proof of distributed enforcement.

### Audit ledger

Append-only security events: event identifier, UTC time, authenticated principal pseudonym, method, route family, status, bounded duration, request correlation ID, and a cryptographic hash chain/periodic external anchor where practical. No API keys, raw authorization headers, wallet secrets, prompt content, or unnecessary transaction/address identifiers. Durable storage separate from ephemeral Render logs. Access restrictions, retention schedule and restoration tests required.

### Network egress

Application DNS checks are not sufficient: hostname DNS checks must not be represented as connection pinning. Require deny-by-default egress plus explicit provider/IP/port controls at a networking layer or dedicated proxy that validates the final resolved destination and TLS hostname and prohibits redirects to disallowed destinations. If hosting tier cannot enforce these, no production release.

## Cost and rollout gates
1. Confirm provider plans, network features, and monthly charges before creating or upgrading infrastructure.
2. No existing production or unrelated database may be used to sidestep costs.
3. Provision isolated staging Key Value/audit storage only after explicit cost approval, or use verified no-cost resources with adequate documented limits.
4. Demonstrate concurrent worker quota consistency, missing-store fail-closed behavior, immutable audit evidence, and egress-denial tests.
5. Security review; rotate credentials; attach rollback plan; explicitly approve manual promotion.

## Current status
- Gemini and public BTC/XCP function-call smoke tests: verified in earlier staging gates.
- Security readiness: **NO-GO** pending shared quotas, durable audit storage, and network-enforced egress.
- Consumer Gemini Gem direct API connectivity: **not established**.
- Signing, broadcasting, settlement, private treasury and wallet access: **prohibited**.

This document is an architecture specification, not a claim that infrastructure exists.
