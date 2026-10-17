# NCTR-CRM-011 — Company CRM and Widget Studio contracts

Status: implementation gate opened; backend integration and production certification pending.

## Tenant boundaries
- Each company has an immutable `company_id`. Locations, customers, orders, staff memberships and widget configurations are scoped by that ID.
- A platform administrator may switch company context only through an audited, server-authorized operation.
- A company administrator can administer only their company's resources.
- Managers can view permitted CRM and order data; cashiers can operate checkout; viewers have explicitly granted read-only scopes.
- Client-provided company IDs, roles, permissions and localStorage records are never authorization evidence.

## Required authenticated endpoints
- `GET /v1/counter/companies` — permitted companies only.
- `GET /v1/counter/companies/{companyId}/customers` — tenant-filtered, paginated.
- `GET /v1/counter/companies/{companyId}/orders` — tenant-filtered, paginated.
- `GET /v1/counter/companies/{companyId}/memberships` — admin only.
- `POST /v1/counter/companies/{companyId}/invitations` — company admin; one-time expiring invite.
- `POST /v1/counter/invitations/{token}/accept` — authenticated acceptance with verified identity.
- `PATCH /v1/counter/companies/{companyId}/memberships/{id}` — role changes, suspension and revocation.
- `GET /v1/counter/companies/{companyId}/widgets` — authorized staff.
- `POST /v1/counter/companies/{companyId}/widgets` — admin; server-generated public widget ID.

Every route must validate the session, tenant membership, capability, input schema and audit trail. Deny by default; reject cross-tenant identifiers with no resource disclosure.

## Widget publication
- Publish a **public**, read-only product/widget configuration by opaque widget ID.
- Widget Studio supports Add to Cart, Cart, Buy Now and Checkout; shows an accessible live preview and copies an embed snippet.
- Browser widgets contain no private merchant credentials or staff session tokens.
- A cart contains product identifiers and quantities; checkout creates a server-priced, expiring order intent. Do not trust client-supplied prices, totals, merchant IDs or callback URLs.
- Merchant-controlled domains and success/cancel URLs must be allowlisted.
- Reuse the existing NEO Counter payment rail and settlement observer; browser redirects are not payment proof.

## Persistence and audit
- Firestore or existing durable service database: companies, memberships, invitations (hashed tokens), customers, orders, widget definitions, audit events.
- Tenant-aware indexes; pagination; data retention; idempotent order creation; invite expiry and replay protection.
- No personally identifiable customer data in GitHub Pages public snapshots or static bundles.

## Release gates
1. Implement authenticated tenant API and integration tests.
2. Implement real invitation acceptance and revocation; prove revoked sessions cannot access company records.
3. Wire CRM views and company switcher to authorized API results; remove local-only role inference as an authorization mechanism.
4. Add Widget Studio preview/embed generator and server-priced cart checkout.
5. Test cross-tenant access, forged roles, tampered cart prices, unsafe redirects, duplicate checkout and failed settlement.
6. Stage, inspect CI, explicitly approve production promotion, and verify end-to-end merchant/customer workflows.

Existing widget v1 and merchant terminal remain in place until the replacement passes these tests.
