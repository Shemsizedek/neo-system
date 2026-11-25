# NEO–AGENT–ALIGN–001 — Project 144 Agent and Worker Alignment

Date: 2026-11-25
Status: DISCOVERY COMPLETE; RUNTIME ALIGNMENT NOT CERTIFIED
Owner: NEOsync / ORIGIN / NIA-001

## Source-of-truth order

1. `docs/source-foundation/NIA-AI-Agent-Constitution-v1.0.md` — agent registration, safety, approvals and lifecycle.
2. `registry/agents.yaml` — canonical roster and identity IDs.
3. Agent manifest — role/scope/version detail, subject to reconciliation with the roster.
4. `orchestration/connector-registry.yaml` and `orchestration/routing-policy.yaml` — connector selection and agent routing.
5. `governance/automation/neo-automation-control-plane.md` — worker approval classes, audit and operating limits.
6. Operations Control Center — evidence-backed gate observations. Unknown health is NOT proof of deployment.

## Inventory: registered roles

13 NIA identities recorded in `registry/agents.yaml`:
NIA-001 ORIGIN (coordination); NIA-002 SCROLL (archives); NIA-003 ATHENAEUM (research); NIA-004 COMPASS (strategy); NIA-005 ECHO (media); NIA-006 LEDGER (economic intelligence); NIA-007 LUMEN (education); NIA-008 FORGE (technology); NIA-009 STEWARD (trust/family office); NIA-010 PA-SARUN (naming); NIA-011 CFO (finance); NIA-012 COMMAND (executive command); NIA-013 RUDWAAN (Instagram interface).

**Important:** `status: active` in the roster denotes a registered lifecycle designation; it does not establish a live instance or valid runtime access.

## Scheduler inventory (as read via connected Automations)

10 enabled: NEO Integration Gate Watch (eFax + Bit Flows), NEO Shopper Deal Watch, NEO Civic Outreach, Run NEO Booker, NEOpass USB Gate Watch, NEO Key Gate Watch, Verify Benable Launch (one-time), NEO Benable Weekly, NEO OpusClip Promotion, Urgent NEO booking alerts.

13 disabled: NEO Vendors & Partners Watch, NEO Sales Outreach, NEO Procurements Texas, NEO Advocate — Political, NEO Tribunal Clerk, NEO Angel health watch, NEO Unified Email Operations, CES reply alert, NEO Bulletin Editorial Desk, NEO Marketer, NEO donor outreach, NEO Autonomous Repair Agent, NEO DNS Host Watch.

Preserve current enablement state. Do NOT re-enable any disabled task merely for uniformity. Do not create duplicate automations or new recurring workloads when existing agents/workers can own them.

## Recommended owner routing

| Workstream | Accountable lead | Supporting specialists | Current worker | Boundary |
| --- | --- | --- | --- | --- |
| Cross-agent orchestration | ORIGIN | COMMAND, FORGE, SCROLL | None dedicated | No assumed runtime authority |
| Bit Flows/eFax integration gates | FORGE | ORIGIN, SCROLL | NEO Integration Gate Watch (enabled) | Read-only gate reviews; no merge/deploy/live workflows |
| Shopper/Deal Desk/Flipper | COMPASS | FORGE, LEDGER, SCROLL | NEO Shopper Deal Watch (enabled) | Buyer verification, no binding offers/contracts or payment |
| Civic outreach | COMMAND | COMPASS, ATHENAEUM, SCROLL | NEO Civic Outreach (enabled) | Prior authorizations only; bounded contact ledger |
| Bookings/paid proposals | COMMAND | ECHO, SCROLL | Run NEO Booker + Urgent NEO booking alerts (enabled) | One outreach ledger/one alerts channel; no duplicate sends |
| NEO Key/NEOpass security | FORGE | ORIGIN, SCROLL | NEO Key Gate Watch + NEOpass USB Gate Watch (enabled) | Separate software gate and physical-device check, no credentials or unsafe enrollment |
| Benable/OpusClip media campaigns | ECHO | RUDWAAN, SCROLL | Benable Weekly, Benable Launch, OpusClip (enabled) | Distinct campaigns, central campaign ledger, no duplicated post |
| Temple publishing | ECHO | PA-SARUN, SCROLL | NEO Bulletin Editorial Desk (paused) | Preserve pause; do not bypass publishing approval |
| Treasury, NEO Bank, commerce | LEDGER | CFO, STEWARD, FORGE | No general active bank worker inferred | No financial execution without legal/compliance and action approval |
| Education/GISD | LUMEN | ATHENAEUM, SCROLL, FORGE | No active school worker verified | Never imply accreditation or production status |
| Tribunal | COMMAND | SCROLL, ATHENAEUM | NEO Tribunal Clerk (paused) | Preserve pause, legal review before filings/service |

An accountable lead in this table is a proposed coordination assignment, not evidence of a deployed agent or grant of new permissions.

## Identified alignment gaps

- REGISTRY_VERSION_DRIFT: `registry/agents.yaml` describes NIA-001 ORIGIN v1.0.0, while `agents/origin/agent.yaml` has v1.1.0.
- ROUTER_SPECIALIST_SCOPE: ORIGIN's explicit `specialists` list includes NIA-002 through NIA-008 plus NIA-013; NIA-009 through NIA-012 are registered but not listed there. Investigate whether exclusion is intentional (sensitive/executive roles), rather than automatically adding them.
- WORKER_IDENTITY_GAP: automation titles and worker identities are not globally keyed to NIA service identities and delegation/evidence records in one reconciled mapping.
- HEALTH_EVIDENCE_GAP: Operations Control Center (revision 162 read on November 25) still reports many projects' staging/production as Unknown. Do not equate registry or scheduled task existence with runtime health.
- OVERLAP_RISK: Booker outgoing follow-up versus urgent booking inbound alerts; Benable/OpusClip versus dormant NEO Marketer; security gate watchers may monitor overlapping PRs. Deduplicate by external message/event key and define one owner per outbound action.

## Common execution envelope (proposed)

```json
{
  "mission_id": "neo-project144-synthetic-001",
  "agent_id": "NIA-008",
  "workstream": "NEO-BITFLOWS-004",
  "authority": "read_only",
  "source_refs": ["github:Shemsizedek/neo-system#1462"],
  "approval_state": "not_applicable",
  "correlation_id": "project144-synthetic-001",
  "dedupe_key": "gate:neo-bitflows-004:synthetic",
  "requested_action": "review_gate",
  "outcome_status": "unverified",
  "observed_at": "2026-11-25T00:00:00Z"
}
```

Requirements: identity, owner, mission/trace ID, allowed capabilities, source of truth, approval class, idempotency key, observed versus claimed outcome, and audit receipt. Secrets and personal records must not enter envelopes or repositories. Tool availability must be reverified at execution.

## Gate acceptance checklist

- [x] Read canonical 13-agent roster.
- [x] Read ORIGIN manifest, agent constitution and connector policy.
- [x] Inspect 23 scheduled automations (10 enabled, 13 paused).
- [x] Confirm updated NEO Integration Gate Watch includes both eFax and Bit Flows.
- [x] Record observed drift and overlap risks.
- [ ] Verify all 13 agent manifests and actual deployed execution bindings, service identities and permissions.
- [ ] Confirm routing decisions for NIA-009 through NIA-012 and correct approved version drift.
- [ ] Record each enabled worker's accountable NIA owner, schedule, source register, permission level, destination and deduplication key.
- [ ] Run an isolated dry-run crossing ORIGIN -> FORGE -> SCROLL with trace/audit evidence, no outbound actions.
- [ ] Verify test results and review before merge into protected default branch.

## Decision

PASS for inventory discovery and governance alignment draft. HOLD for universal runtime alignment certification. No task state, production permissions, payment operations or external campaigns modified as part of this gate.
