# MERCHANT-050 — Authorized clean rebuild

User directive 2026-10-21: Existing Merchant Center product inventory is not valid; start fresh. Prior inventory preservation assumptions are superseded **for Merchant Center product listings and their feeds**, not website content or legal identity.

## Protected scope
- Keep the live NEO Shop storefront, The House of Negus branding, provider checkout infrastructure, World Temple identity evidence and historic review correspondence.
- Never delete the underlying merchandise-provider catalog merely because Google listings are invalid.
- Do not change account legal identity, billing or Google Ads configurations, and do not file a reconsideration request during reset.

## Reset steps
1. Authenticate to Google Merchant Center account 5429352076 and inventory all current primary and supplemental data sources and their scheduled/API/automatic refresh dependencies.
2. Disable old feed refresh/autodiscovery mechanisms *before* removal to prevent repopulation; record source IDs and operations. Any removal must be performed in the authorized Merchant Center account, not inferred from repo files.
3. Remove obsolete product sources/listings; verify processing and counts. Preserve an audit log of actions, not the invalid product catalogue as publishable inventory.
4. Source only currently purchasable product records with actual individual item URLs and observed prices, images, availability, variants and checkout.
5. Generate one validated primary catalog source, stable IDs, correct content language and target market, consistent retailer identity and shipping/returns.
6. Run feed validator, check crawler behavior and checkout; monitor reimport errors and Merchant Center account-level verification requirements.
7. Review eligibility only after every verified issue is resolved. Do not submit appeal until separately authorized.

## Execution status
- Merchant Center browser access returned originating-browser-context error. No live deletion or source disconnection executed in this gate.
- Rebuild scope recorded; account and live inventory remain unchanged pending authenticated access.
