# SHOP-015 — product-aware social commerce contract
Status: specification only; no live Meta, Muse, or Spreadshop catalog token provisioned.

## Required normalized product fields
```json
{
  "source": "spreadshop|meta|neo",
  "source_product_id": "string",
  "merchant_id": "string",
  "title": "string",
  "description": "string",
  "canonical_url": "https://...",
  "image_url": "https://...",
  "price": {"amount": "12.34", "currency": "USD"},
  "availability": "in_stock|out_of_stock|unknown",
  "visibility": "public|private",
  "catalog_approved": false,
  "native_tag_eligible": false,
  "last_verified": "ISO-8601"
}
```

Unknown price, availability, ownership or eligibility must never be guessed.

## Automation contract
For each outgoing post: deduplicate event ID; classify commercial relevance; validate product merchant ownership, inventory, available destination, policy eligibility and freshness; select no product by default when uncertain; attach native Meta product tags only with verified catalog IDs and actual granted permissions. Otherwise attach a canonical product URL only if platform supports links. Record the selection and post outcome.

## Security
Separate read/catalog and publish permissions; no merchant credentials in frontend; short-lived delegated tokens with scopes; per-agent identity; idempotency keys; kill switch; rate limits; explicit consent; audit trail. No wallet/payment execution.

## Verification gates
1. Browser-confirm live Spreadshop products and checkout on staging.
2. Compare custom domain response and certificate for neoshop.holytemples.org.
3. Confirm merchant catalog export/API authorization.
4. Confirm Instagram shop eligibility and product-tagging API permissions.
5. Connect publishing webhook or approved provider adapter; one dry run and one authorized live post.
