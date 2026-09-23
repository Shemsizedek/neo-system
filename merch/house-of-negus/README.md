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
