# NEO Relations

NEO Relations is the universal white-label CRM and relationship graph for NEO Services.

## Gate 1 foundation

- Canonical person and organization records
- Relationship graph across NEO Services
- Multi-tenant white-label configuration
- Role and permission boundaries
- Contacts, organizations, leads, opportunities, cases, tasks, interactions, agreements, subscriptions, and audit events
- Initial tenant profiles for NEO Prime and NEOpay
- REST contract for shared CRM services

## Operating model

NEO Router connects systems. NEO Relations connects people, organizations, accounts, services, and their history. NEO Prime coordinates workflow and NEO Algo may provide advisory intelligence such as deduplication, entity resolution, summaries, scoring, and next-best-action recommendations.

Authorization-sensitive actions remain subject to tenant permissions and approval gates.

## Canonical identity

A single entity may hold multiple service relationships without creating duplicate contact records. Example: one person can simultaneously be a NEOpay customer, NEO Exchange trader, NEO University student, and NEO Wire subscriber.

## Files

- `schema/relations.sql` — baseline relational schema
- `openapi.yaml` — initial API contract
- `tenants/neo-prime.json` — executive/institutional CRM profile
- `tenants/neopay.json` — payments/customer CRM profile

## Next gate

Add persistence migrations, API handlers, authentication/authorization middleware, dashboard UI, tenant registry loading, tests, and NEO Router integration.