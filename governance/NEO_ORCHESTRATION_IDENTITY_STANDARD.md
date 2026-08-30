# NEO Orchestration Identity Standard

The canonical founder principal `neo:founder:000001` is reserved as Account #1 for NEO Router, NEO Algo, NEOsync, and the shared NEO Agent Runtime.

Founder ownership does not grant autonomous execution authority. Agents, routers, planners, and model-backed workers operate as separately identifiable principals with explicitly delegated scopes.

## Invariants

- Agents may not silently impersonate the founder.
- Founder status does not bypass authentication, delegation checks, connector permissions, external-tool authorization, financial authorization, or step-up controls.
- High-impact actions such as external tool execution, trade execution, credential access, secret access, destructive administration, or financial movement require explicit authorization and auditable approval.
- Agent registrations store identifiers and scopes, not passwords, API keys, private keys, session tokens, recovery codes, or other secrets.
- External AI systems and SaaS tools keep their native identities and permission models; NEO mappings do not override third-party ownership or authorization.
- NEO Algo advisory/reasoning authority is distinct from trade, payment, treasury, custody, or signing authority.

## Delegation

Every executable task should identify the requesting subject, delegated agent, granted scope, target connector/tool, authorization state, and resulting audit event. Scope must be least-privilege and revocable.
