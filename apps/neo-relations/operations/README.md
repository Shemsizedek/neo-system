# NEO Relations Controlled Operations

This gate turns NEO Relations from read-only control into approval-gated operations without allowing Discord, AI, or a browser client to directly perform sensitive CRM mutations.

## Flow

1. An authorized operator or NEO Router source proposes a change.
2. NEO Relations validates tenant scope and RBAC.
3. The system records a write intent with `pending_approval` status.
4. An append-only audit event records the proposal and correlation ID.
5. A different authorized approver may approve or reject the intent.
6. Approval is a decision record, not execution.
7. A later execution service may apply approved intents using its own scoped service credential and must write the execution result to the audit log.

## Non-negotiable controls

- Default deny.
- No cross-tenant writes.
- Cross-tenant reads require explicit policy.
- No self-approval.
- AI may recommend but may not approve.
- Discord may create read-only requests or future intents, but may not execute sensitive actions.
- Payment execution and identity changes remain outside this gate.
- Secrets remain in server/runtime secret stores, never GitHub Pages JavaScript or committed configuration.

## RBAC

- `relations.viewer`: tenant-scoped reads and audit reads.
- `relations.operator`: viewer permissions plus intent creation and Router event ingestion.
- `relations.approver`: operator permissions plus intent approval/rejection.
- `relations.admin`: approver permissions plus tenant and RBAC configuration.

## Router ingestion

`POST /api/relations/router/events` accepts the canonical Router event envelope. Sources must be authenticated by the runtime and mapped to allowed tenant scopes before the event is accepted.

Accepted events are audit-first: validation and audit recording occur before any downstream workflow is triggered.

## Execution boundary

This repository currently defines contracts and policy. It does not claim that a durable authenticated database or execution worker is active until a runtime and persistence layer are separately deployed and verified.
