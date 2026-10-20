# NEO SHOP-016 — Catalog Ingestion and Product Selection
Read-only service, not a merchant catalog sync or Meta publisher.

## Routes
- GET /health: public operational status (no catalog data).
- GET /v1/catalog: bearer-authenticated retrieval and validation of an approved JSON product feed.
- POST /v1/select: bearer-authenticated keyword-based product suggestion for { "text": "..." }. No native product tag or publication performed.

## Feed configuration
- NEO_CATALOG_TOKEN: a long secret, installed only through environment manager.
- NEO_CATALOG_FEED_URL: HTTPS product feed that NEO is authorized to access; schema must match SHOP-015 social catalog spec.
- NEO_CATALOG_ALLOWED_HOSTS: comma-separated exact DNS hostnames allowed for that feed URL.

Without these the service intentionally rejects reads. A Spreadshop *embed* is not a product API or export feed. No prices, inventory, Meta catalog IDs, or native tag eligibility can be inferred from it.

## Safety gates
No customer credentials in source control, no posting, no wallet/checkout operations, redirect-free feed request, domain allowlist, feed size and request limits. Need stronger SSRF egress controls and scoped OAuth for production credentials. Authenticated feed route is private; deploy as staging only until vetted.

## Follow-on
Secure source feed and merchant rights, test catalog mapping and item URLs, identify owned Meta commerce catalog, certify Instagram native tag permissions, introduce separate publishing adapter with idempotency and human-overridable policies. React shop runs independently.
