# NEO Relations persistence runtime

This directory defines the first durable operational runtime boundary for NEO Relations.

## Required runtime capabilities

- PostgreSQL-compatible database with `schema/relations.sql` followed by `schema/002_controlled_operations.sql`.
- HTTPS API implementing the NEO Relations OpenAPI contract.
- Upstream JWT verification before constructing an actor object.
- Actor claims mapped to `{ id, type, tenantIds, roles, surface, fingerprint }`.
- Tenant membership and RBAC enforced again inside the repository layer.
- Router service identities authenticated separately from human users.
- Secrets supplied only through runtime environment/secret storage.

## Runtime environment contract

The Discord gateway may use:

- `RELATIONS_API_BASE` — public HTTPS base URL for the authenticated Relations runtime.
- `RELATIONS_API_TOKEN` — server-side bearer credential scoped to read pending intents only.

These values must never be exposed to GitHub Pages or committed to the repository.

## Approval boundary

Discord has read-only visibility into pending intents. It cannot approve, reject, or execute an intent. Approval requires a verified human actor with `approver` or `admin`, same-tenant membership, and a different actor ID from the intent creator. AI identities cannot approve. Execution remains a separate future worker and is not enabled by this gate.

## Deployment sequence

1. Provision PostgreSQL.
2. Apply the baseline and controlled-operations migrations.
3. Deploy an HTTPS runtime implementing OpenAPI v0.2 and using `RelationsRepository`.
4. Configure trusted JWT issuer/audience and Router service credentials.
5. Configure the Discord gateway with a read-only runtime credential.
6. Verify create-intent -> audit -> pending-approval read -> human decision -> audit flow.
7. Only after that verification, consider a separately permissioned execution worker.
