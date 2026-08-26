# NEO Enterprise Command Federation

This Worker is the private federation bridge between the NEO Government Executive Console and NEO Enterprise organization state.

## Federation scope

The Government console can inspect enterprise health and make tightly scoped decisions on existing Enterprise approval records without exposing Government controls to Enterprise users.

## Enterprise Policy Engine

Policy is stored per organization in `PolicyStore`.

Default policy:
- Single executive approval up to 10,000 USD.
- More than 10,000 USD requires two distinct approving identities.
- 100,000 USD and above is automatically placed on HOLD.
- Requester/approver separation can be enforced.
- Policy changes are versioned and rollback creates a new version rather than deleting history.

## Delegation & Escalation Engine

Delegation is stored per organization in `DelegationStore`.

It supports:
- primary executive approvers;
- amount-based approval bands;
- backup approvers;
- time-based escalation windows;
- temporary delegated authority with expiration and optional amount caps;
- delegation history;
- server-side enforcement of who may cast an approval vote.

If an approval remains unresolved beyond the configured escalation window, backup approvers become eligible. The federation summary exposes `dueAt` and `escalated` state so the Government console or future NEOsync workflows can surface overdue decisions.

Empty approver lists preserve executive-admin compatibility: any authenticated Government executive may approve unless a more specific delegation matrix is configured.

## Security boundary

- `MODULE_ADAPTER_TOKEN` is required for every federation data or decision request.
- `/health` exposes service health only.
- Government Cloudflare Access identity is propagated as the actor.
- The Worker binds directly to the EnterpriseStore exported by `neo-enterprise`.
- Policy and delegation controls govern approval records only.
- Wallet signing, payments, transfers, terminal execution, arbitrary business mutation, legal enforcement, policing, and coercive execution remain outside this bridge.

## Required configuration

Set the same `MODULE_ADAPTER_TOKEN` secret on `neo-government` and `neo-enterprise-federation`.

Set on `neo-government`:
- `ENTERPRISE_FEDERATION_URL=https://neo-enterprise-federation.<your-workers-domain>`

## Routes

- `GET /health`
- `GET /summary`
- `GET /organizations/:id`
- `GET|PUT /organizations/:id/policy`
- `GET /organizations/:id/policy/history`
- `POST /organizations/:id/policy/rollback/:versionId`
- `GET|PUT /organizations/:id/delegation`
- `GET /organizations/:id/delegation/history`
- `POST /organizations/:orgId/approvals/:approvalId/decision`

All routes except `/health` require the federation bearer token.
