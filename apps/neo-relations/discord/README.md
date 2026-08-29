# NEO Relations Discord Control Plane

Discord is the operational event and command plane for NEO Relations. GitHub remains the source/configuration backbone and GitHub Pages serves the browser UI.

## Security boundary

GitHub Pages is static and must never contain Discord bot tokens, webhook URLs, GitHub write tokens, private CRM records, signing keys, or privileged API credentials. Secret-bearing Discord operations execute only from trusted automation/runtime contexts.

## Initial event channels

- `relations.deploy` — GitHub Pages deployment status
- `relations.entity.created` — canonical entity creation notification
- `relations.relationship.changed` — service relationship update
- `relations.case.opened` — CRM case event
- `relations.case.escalated` — approval/escalation event
- `relations.approval.required` — privileged action approval request
- `relations.audit` — audit/control-plane event

## Planned Discord commands

- `/relations status`
- `/relations find <query>`
- `/relations entity <id>`
- `/relations cases`
- `/relations case <id>`
- `/relations services`
- `/relations tenant <id>`

Read-only commands can be automated once the Discord application runtime is available. Mutating or financially sensitive commands must enforce authentication, tenant RBAC, audit logging, and explicit approval policy.

## Runtime truth

Discord provides APIs, webhooks, interactions, channels, and the operational control surface; it does not itself host arbitrary application server code. A persistent bot or Discord interactions endpoint therefore still needs an HTTPS runtime. Until that runtime is selected, GitHub Actions can safely publish outbound Discord webhook events while GitHub remains the authoritative backend/configuration store.
