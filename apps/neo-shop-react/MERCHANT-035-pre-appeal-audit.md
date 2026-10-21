# MERCHANT-035 — pre-appeal account verification, 2026-10-21
## Observed from the connected merchant browser tab
- Account: 5429352076; top bar displays **World Temple**.
- Merchant Center overview: critical **Misrepresentation** account-level issue.
- Inventory: ~2.78K total; 0 approved; ~2.78K not approved; 0 under review.
- Google Ads: separate account suspension, not proven to have the same cause.
- Google email dated 2026-09-28 confirms unsuccessful Misrepresentation review; potential ID verification only if demanded in account.
- Merchant Center overview offers a **Fix issue** action; the account-specific detail page was NOT inspected in this read-only browser session.
## Observed from the connected storefront tab
- https://shop.holytemples.org/ displays embedded merchandise, several product titles, photos and prices.
- The embedded merchant's own navigation includes shipping, returns, privacy, terms, contact and order support.
- Shop origin uses client-side embedded content and hash navigation; individual Google product URLs and Googlebot-rendered content NOT yet verified.
- The House is the shortened store name for The House of Negus. World Temple is the account organization. This alone does not prove the legal merchant of record.
## Successfully implemented
- Website SEO titles, merchant-store nickname, social metadata and static-first website.
- Storefront organizational contact and shop-specific checkout policies.
- Latest Render service deploy `dep-dbc413on74is73fa6va0` was verified live.
## MUST DO BEFORE REVIEW (no guessing)
1. Visit https://merchants.google.com/mc/merchantprofile/businessinfo?a=5429352076 : verify account legal entity, business contact, website claim/verification against trustworthy records; do not overwrite legal data from assumptions.
2. Visit https://merchants.google.com/mc/products/sources?a=5429352076 : enumerate real product feeds, source names, supported update methods, whether duplicates or old shop domains exist. Preserve existing data until backed up and verified.
3. Visit https://merchants.google.com/mc/items?a=5429352076 : capture item diagnostics, sample disapproved identifiers and item landing URLs; compare at least three exact SKUs on browser and mobile.
4. Visit https://merchants.google.com/mc/shipping/services?a=5429352076 : compare Google shipping and return settings with the live embedded retailer's shop-specific terms.
5. Open overview's **Fix issue** in the signed-in Merchant Center UI to inspect precisely required ID/verification tasks. No review request yet.
6. Verify item-specific landing URL, matching variant, price, availability, functioning cart and seller disclosed at checkout. Avoid making every item link to https://shop.holytemples.org/.
7. Confirm current Googlebot accessibility and secure HTTPS on product URLs; embedded store rendering in a human browser is not equivalent to crawled item pages.
8. Only after all above are evidenced, obtain eligibility and request one appropriately timed review.
## Integration constraints
- Windsor.ai Google Merchant read is currently paused due to exceeding account limit (13 connected, Free supports 1); tool-supplied 0s are bogus, not actual product counts.
- Connected Browser tool can read **already-open tabs** but cannot navigate/click in this mode; no authentic issue detail, business settings, sources or item diagnostics was surfaced in already-open overview tab.
- No direct writable Google Merchant Center integration was found. Do not claim to fix account settings or submit appeal.
