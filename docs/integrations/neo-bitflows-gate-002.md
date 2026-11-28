# NEO–BITFLOWS–002 — WordPress Automation Integration Contract

Status: PROPOSED / NOT DEPLOYED  
Date: 2026-11-25  
Owner: Project 144 / NEO Core  
Target WordPress site: https://holytemples.org  
Plugin: Bit Flows (`bit-pi/bit-pi`), installed and activated at version 1.34.1

## Discovery evidence

- The WordPress connector confirmed the plugin as active and reporting no available update on November 25, 2026.
- The WordPress plugin directory documents incoming/outgoing webhooks, HTTP/API actions, WordPress and WPForms triggers, conditions, logs, and optional AI actions.
- Pro-gated human-in-the-loop and MCP features must not be assumed available.
- `governance/automation/neo-automation-control-plane.md` is the pre-existing authority for approval classes, audit, idempotency, limits, and kill switches.
- `server/neo-bots/README.md` defines service identity, scope and approval conventions.
- `api/router-events.mjs` currently allows only github, asana, gmail, and airbyte event sources. **Do not use it for Bit Flows traffic as-is.**
- WordPress.com backup restore and staging-site access are not available at the site's current plan. No restore was tested.

## Architecture and ownership

`holytemples.org event -> Bit Flows trigger -> restricted outbound HTTPS call -> NEO Core intake/queue -> domain-specific authorized worker -> receipt/audit`

- Bit Flows owns local event capture, transformation and dispatch; it is NOT authoritative for identity, financial settlement, signed contracts, legal records or NEO agent authorization.
- NEO Core validates source authentication, authorization, schema, event ID, replay window and idempotency, then records the accepted/rejected event before dispatch.
- Domain workers handle Booker, Shopper/Deal Desk, marketing and commerce **only within existing Project 144 governance**.
- The integration endpoint is **proposed**, not currently deployed: `POST /api/integrations/bitflows/events`. Do not assume it is reachable.
- No production endpoint, credentials, webhook URLs or live workflows have been configured by this gate.

## Minimal intake contract, version 1

Example *synthetic* payload (all values fictitious):

```json
{
  "schema_version": "neo.bitflows.event.v1",
  "event_id": "bf-test-000001",
  "occurred_at": "2026-11-25T20:00:00Z",
  "source": "holytemples.org",
  "event_type": "form.submission.received",
  "subject": { "type": "lead", "external_id": "synthetic-123" },
  "correlation_id": "project144-test-000001",
  "data": { "test_only": true }
}
```

Do not include customer PII in initial test events. Proposed response: 202 with a receipt and correlation ID; identical event ID with same body returns the original receipt (idempotent); mismatched replay returns 409; invalid authentication returns 401; forbidden scope 403; invalid schema 400; durable storage unavailable 503. These are **acceptance requirements**, not implemented behavior.

## Security requirements

1. Authenticated TLS-only outbound requests to a fixed allowlisted endpoint; no arbitrary user-defined callback URL.
2. Prefer request-level HMAC signature over exact raw body plus timestamp with secret stored server-side. If free Bit Flows cannot generate suitable HMAC signatures, use a dedicated narrowly scoped bearer token only with a server-side validation proxy and rotate it regularly; verify exact supported capability before configuration.
3. Per-source scope separation, event size limits, schema allowlist, replay protection (timestamp and nonce/event ID), durable idempotency and rate limiting.
4. Secrets only in secure runtime/WordPress connection storage, never repository, logs, page content, or client bundle.
5. Privacy minimization, consent, retention and deletion policy; log only request IDs, event types and redacted error messages.
6. Fail closed if authentication, authorization, storage, or policy check cannot be completed.
7. Default kill switch OFF (`NEO_BITFLOWS_ENABLED=false`); explicit operator approval needed for live enablement.
8. Human approval for governed outbound communications or production updates, and human-only handling for irreversible money movement and binding contracts.

## Candidate workflows (none activated)

| Flow | Trigger | Proposed action | Approval class |
| --- | --- | --- | --- |
| Lead intake | WPForms submission | Validate and queue a prospect record; no automatic solicitation | A for internal triage; C for outreach |
| NEO Booker | Qualified inbound booking request | Create pending review task and draft a meeting reply; no invitation or payment claims | A draft; C outbound |
| Shopper / Deal Desk | Manually approved deal intake | Match internal synthetic buyer criteria, create recommendation for approval; no offers/contracts | A research; D binding contracts |
| Media operations | Approved editorial event | Create a WordPress draft, not publication | A draft; C publish |
| NEO Counter | Non-sensitive commerce notice | Inform the internal review queue; never settle or release an invoice | A notifications; D transfer |

## Verification checklist / exit criteria

- [x] Plugin active in WordPress inventory (2026-11-25).
- [x] Official documented webhook and HTTP action capabilities reviewed.
- [x] Existing NEO automation governance and routing constraints inspected.
- [ ] Obtain a recoverable WordPress backup / test rollback strategy.
- [ ] Inspect Bit Flows on-site settings, installed license and actual flow list without exposing secrets.
- [ ] Verify an isolated NEO Core staging target and non-production durable data store.
- [ ] Implement intake adapter and automated schema/auth/idempotency tests on feature branch.
- [ ] Independently verify external request signing method supported by current Bit Flows tier.
- [ ] Send one synthetic event to staging; verify accepted, duplicate, replay, unauthorized and fail-closed cases.
- [ ] Confirm audit receipts and halt/rollback controls.
- [ ] Obtain explicit gate authorization before any live flow or external message.

## Decision / next gate

Gate 002 **PASS for capability discovery and contract documentation; HOLD for integration activation.**  
Gate 003: build and test a dedicated, fail-closed intake adapter against isolated staging, after confirming access and backup/recovery evidence. Keep production and financial actions unchanged.

Sources: https://wordpress.org/plugins/bit-pi/ ; https://bit-flows.com/users-guide/triggers/integrations-webhook-integrations-as-trigger/ ; https://bit-flows.com/users-guide/actions/integrations-webhook-integrations-as-action/
