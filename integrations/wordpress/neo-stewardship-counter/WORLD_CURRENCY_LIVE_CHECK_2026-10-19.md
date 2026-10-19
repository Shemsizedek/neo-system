# World Currency production verification — 0.19.0

Deployed active to holytemples.org on 2026-10-19. The public Holy Stewardship page renders 121 currency-directory rows, including Bahamian Cash, Credit Profile Number Token and MOBITOKEN. No PHP fatal error was visible in the returned page. The public currencies endpoint returns version 0.19.0 and 121 entries. The settlement endpoint reports storageConstraintsChecked=true; paymentsEnabled remains false.

The directory and merchant selector share the registry. Unit/integration tests cover catalog completeness, stable IDs, duplicate-symbol search, per-ledger explorer links, identity separation, merchant currency precision, current-market rejection, once-rounded 9% pricing, private order creation, payment replay/reorg and form rendering. Existing JS and daily-market tests also passed. Operator browser interaction was not exercised on production and no production member order was created during this gate.

Source audit independently reads Classic and CP2 asset APIs: 28 and 29 source-treasury currency assets respectively verify, plus native BTC/XCP. A matching token name alone does not enable collection. Rates remain subject to daily validation. Automatic payment collection and delivery remain disabled; no financial transfer or signature occurred.
