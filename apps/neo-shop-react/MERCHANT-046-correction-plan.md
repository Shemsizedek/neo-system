# MERCHANT-046 — Feed triage and source-preserving correction plan

Date: 2026-10-21. Merchant Center account: 5429352076.

## Known facts
- Prior authenticated overview: approximately 2,780 submitted products, 0 approved; account-level Misrepresentation suspension.
- Storefront: The House (short name for The House of Negus), shop.holytemples.org, merchant collection embedded from external fulfillment storefront.
- Neither individual Merchant item diagnostics nor authoritative feed export is currently accessible from this execution.
- Browser connector returns an originating-browser-context error; Windsor.ai reporting returns invalid plan-limit sentinel data and must not be used as real diagnostics.
- Gmail search did not locate a Merchant CSV/XML feed attachment.
- Existing CSV audit and synthetic regression fixture are code only; no production feed records have been examined.

## Correction strategy — preserve real inventory
1. From Merchant Center > Settings > Data sources, list each primary and supplementary source (source ID, method, feed label, target country/language, item count, refresh history). Export a snapshot before modifications.
2. From Products > Needs attention, export product-level diagnostics including offer_id/id, item status, issue code, source, title, link, price, availability, image_link, item_group_id, variant attributes. Distinguish account-wide policy suppression from field-level rejection; never label all ~2,780 SKUs individually defective based solely on account suspension.
3. Join feed rows to source catalog records on *existing* offer IDs; do not regenerate IDs, reissue variants, or overwrite the primary source with a guessed CSV.
4. For each source record, verify link leads to the precise purchasable variant, with visible price, currency, availability, image, shipping, and checkout. Flag homepage or hash-route destinations for *manual browser and crawler verification*; avoid automatically classifying every hash route as invalid.
5. Confirm actual merchant-of-record, correct Google business legal details, and provider shipping/returns against the live checkout. Resolve account-level identity prompts only in Google's secure portal.
6. Produce an item-keyed correction diff and backout snapshot. Apply fixes only to the original authorized data source, refresh feed, and verify that errors decline without creating duplicates.
7. Perform Googlebot/crawler and representative checkout testing. Do not request review until account and item-level issues and any verification prompts are resolved.

## Unresolved blockers
- Authenticated product source details and the actual feed export; account-specific 'Fix issue' details.
- Ability to modify original product feed and observe import results.
- Real item-level crawl/checkout comparison.
- Regression test execution in an environment with Node.js and repo access.

## Release rule
Do not delete legitimate inventory, change legal identity, change store ownership, or request Merchant Center appeal without verified evidence and any required authorization.
