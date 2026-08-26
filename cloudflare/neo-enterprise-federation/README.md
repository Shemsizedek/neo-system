# NEO Enterprise Command Federation

This Worker is the private federation bridge between the NEO Government Executive Console and NEO Enterprise organization state.

## Federation scope

The Government console can inspect enterprise health and make tightly scoped decisions on existing Enterprise approval records without exposing Government controls to Enterprise users.

The federation reports organization health, members, public wallet bindings, terminals, pending approvals, NEO Books summaries, invoices, audit events, and policy state.

## Enterprise Policy Engine

Policy is stored per organization in the `PolicyStore` Durable Object.

Default policy:

- Single executive approval up to 10,000 USD.
- More than 10,000 USD requires two distinct approving identities.
- 100,000 USD and above is automatically placed on HOLD through the Government federation path.
- A requester cannot approve their own request when separation of duties is enabled.
- Rejection and HOLD remain immediate protective decisions.
- Thresholds and separation-of-duties controls are configurable per organization.

The policy engine does not move funds. It only governs Enterprise approval records. Wallet signing, payments, transfers, terminal execution, legal enforcement, policing, and coercive activity are outside this bridge.

## Security

- `MODULE_ADAPTER_TOKEN` is required for every federation data or decision request.
- `/health` exposes service health only.
- Government Cloudflare Access identity is propagated as the decision actor.
- The Worker binds directly to the `EnterpriseStore` Durable Object exported by `neo-enterprise`.
- Policy state and distinct approval votes are persisted in `PolicyStore`.

## Required configuration

Set the same `MODULE_ADAPTER_TOKEN` secret on `neo-government` and `neo-enterprise-federation`.

Set on `neo-government`:

- `ENTERPRISE_FEDERATION_URL=https://neo-enterprise-federation.<your-workers-domain>`

## Routes

- `GET /health`
- `GET /summary`
- `GET /organizations/:id`
- `GET /organizations/:id/policy`
- `PUT /organizations/:id/policy`
- `POST /organizations/:orgId/approvals/:approvalId/decision`

All routes except `/health` require the federation bearer token.
