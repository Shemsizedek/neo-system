# House of Negus Merch Automation

HN-MERCH-AUTO-002 provides an additive monthly-drop pipeline for the live Shemsizedek Spreadshop.

## Boundary
Spreadshop's Public Shop API is read-only for shop content: it can verify sellables/designs but cannot upload or modify Partner Area content. Publishing therefore remains an explicit Partner Area gate until Spreadshop exposes a supported write API.

## Flow
PLAN -> ARTWORK_QC -> APPROVE -> PARTNER_AREA_PUBLISH -> VERIFY -> PROMOTE -> MEASURE

Set repository variables:
- SPREADSHOP_SHOP_ID
- SPREADSHOP_PLATFORM (net|de; default net)

Set repository secret:
- SPREADSHOP_API_KEY

The monthly workflow creates a drop manifest artifact and, when credentials exist, snapshots live sellables for verification.


## Google Merchant feed adapter

HN-MERCH-AUTO-018 adds a downstream Google Merchant RSS 2.0 feed built from the live Spreadshop sellables snapshot.

Flow:
SPREADSHOP_SYNC -> MERCHANT_NORMALIZE -> FEED_BUILD -> VALIDATE -> PUBLISH_ENDPOINT -> GOOGLE_MERCHANT_SOURCE

Commands:
- `node scripts/spreadshop-google-merchant-feed.mjs`
- `node --test scripts/spreadshop-google-merchant-feed.test.mjs`

Outputs:
- `merch/house-of-negus/generated/google-merchant.xml`
- `merch/house-of-negus/generated/google-merchant-report.json`

Optional repository variable:
- `SPREADSHOP_STORE_URL` — canonical public storefront base URL used when Spreadshop returns relative product URLs.

The feed builder rejects incomplete items instead of publishing malformed Merchant Center rows. Rejections are recorded in the report artifact for remediation.
