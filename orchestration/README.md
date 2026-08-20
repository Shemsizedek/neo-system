# NEOsync Multi-Agent Orchestration Layer

This directory defines how ORIGIN routes missions across the eight-agent NEOsync core roster.

## Core principle
ORIGIN owns coordination, not specialist expertise. It decomposes missions, selects the smallest necessary agent set, preserves context, tracks approvals, and synthesizes outputs without silently expanding permissions.

## Core roster
- NIA-001 ORIGIN — command and coordination
- NIA-002 SCROLL — archives, provenance, canonical records
- NIA-003 ATHENAEUM — research and evidence synthesis
- NIA-004 COMPASS — strategy and execution design
- NIA-005 ECHO — media and communications
- NIA-006 LEDGER — treasury and economic intelligence
- NIA-007 LUMEN — education and knowledge transfer
- NIA-008 FORGE — technology and systems architecture

## Routing modes
1. **Direct** — one specialist handles the mission.
2. **Sequential pipeline** — one agent's output becomes the next agent's input.
3. **Parallel analysis** — multiple specialists analyze independent dimensions and ORIGIN synthesizes.
4. **Review loop** — a specialist output is checked by another role before approval.

## Default pipelines
- Research → Strategy: ATHENAEUM → COMPASS → ORIGIN
- Research → Media: ATHENAEUM → ECHO → ORIGIN
- Research → Education: ATHENAEUM → LUMEN → ORIGIN
- Strategy → Finance: COMPASS → LEDGER → ORIGIN
- Strategy → Technology: COMPASS → FORGE → ORIGIN
- Technology cost case: FORGE → LEDGER → ORIGIN
- Canonical archive: specialist → SCROLL → ORIGIN
- Full initiative: ATHENAEUM → COMPASS → [LEDGER | FORGE | LUMEN | ECHO as needed] → SCROLL → ORIGIN

## Approval model
A routing decision never grants new authority. If any target agent marks an action as approval-required, ORIGIN must stop at that checkpoint and surface the decision to the authorized human or approved workflow.

## Files
- `routing-policy.yaml` — capability and delegation rules.
- `mission-envelope.schema.yaml` — shared task/handoff contract.
- `workflow.schema.yaml` — reusable multi-agent workflow definition.
