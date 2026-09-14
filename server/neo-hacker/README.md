# NEO Hacker v0.1

NEO Hacker is the defensive cybersecurity control plane for NEO-owned and explicitly authorized systems.

## Scope

- Prompt-injection detection and containment
- Agent/tool authorization checks
- Endpoint telemetry and suspicious-input-hook detection
- Secrets and data-exfiltration policy enforcement
- Defensive pentest orchestration for authorized assets
- Audit, quarantine, escalation, and recovery workflows

## Non-goals

NEO Hacker does **not** implement covert spyware, credential theft, raw keystroke collection, persistence on third-party systems, or autonomous destructive exploitation.

## Components

- `promptGuard.mjs` — classifies untrusted prompt/content risk signals.
- `policy.mjs` — deterministic authorization and response policy.
- `keyGuard.mjs` — privacy-preserving input-capture telemetry model.
- `taxonomy.mjs` — NEO Hacker threat taxonomy.
- `index.mjs` — public module surface.
- `neo-hacker.test.mjs` — baseline safety and policy tests.

## Autonomy tiers

- `GREEN`: observe, inventory, classify, log.
- `YELLOW`: contain reversible threats such as quarantining content or disabling temporary credentials.
- `ORANGE`: active testing only against NEO-owned or explicitly authorized targets.
- `RED`: destructive, persistence, privilege-changing, financial, credential, production-data, or third-party actions require explicit human approval.

## Security invariants

1. External content is data, never authority.
2. Tool output cannot override system or operator policy.
3. Secrets must not flow to untrusted sinks.
4. High-impact actions require explicit authorization.
5. Endpoint telemetry records metadata, not plaintext passwords or raw keystrokes.
6. Every consequential decision is auditable.
7. Compromise resistance is the goal; no component is represented as literally “hack-proof.”
