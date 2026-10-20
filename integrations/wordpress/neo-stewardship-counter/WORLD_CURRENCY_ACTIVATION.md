# World Currency catalog — NEO Counter 0.19.0

The current catalog at https://worldcurrency.finance.blog/ contains 121 entries. This release adds the three entries absent from the older 118-row registry: BSC Bahamian Cash, CPN Credit Profile Number Token, and MBT Mobi Token. Existing IDs and repeated display symbols remain distinct.

32 entries now have explicit asset identifiers, including BTC/XCP. Newly resolved blog links are MXC → MEXICACOIN, GHC → GHANACASH, MBT → MOBITOKEN, ZMC → ZAMBIACASH and SVC → SOVEREIGNC. A mapping does not by itself verify treasury ownership or establish a price. Sovereign Coin's mapped asset remains subject to treasury verification. NOMNI verifies under the source treasury on CP2, not Classic.

Audit: world-currency-audit-2026-10-19.json contains separate Classic/CP2 asset identity responses. The treasury address's asset index returned 50 Classic and 51 CP2 assets. Of the listed currencies, 28 treasury assets verified on Classic and 29 on CP2, plus native BTC/XCP. This is a snapshot of asset identity, not a node consensus proof or evidence of liquidity. No missing assets, issuers, owners, rates or fiat parity were invented.

The Holy Stewardship page now includes a collapsible, searchable World Currency directory with all 121 rows, token links for the selected ledger, and mapping/verification status. [neo_world_currencies] also renders the directory independently. GET /wp-json/neo-counter/v1/currencies exposes the public registry and provenance.

The existing checkout selector and the merchant setup now use the same catalog. Merchant draft setup accepts a mapped currency only when the existing daily-market reader validates its asset, source treasury and positive price for the selected ledger. Precision comes from the verified market response: divisible tokens use eight decimal places; indivisible tokens use whole units. The 9% markup is applied once, rounding upward to the token's smallest unit. No BTC fallback substitutes for an unavailable token quote. Existing BTC/XCP drafts remain supported; legacy API parameters are normalized through the registry.

Rates still refresh through the daily market process. The directory does not make 121 upstream price calls per page view. Its verification metadata is a dated audit; actual quote preparation rechecks the daily market/ownership policy. Pending entries remain visible; they cannot produce a fabricated quote. All enabledForCollection flags remain false and payment activation/automatic delivery remain disabled.

Validation includes current catalog completeness, new mappings, stable unique IDs, duplicate-symbol search, selected-ledger explorer links, precision/rounding, unavailable-rate rejection, Classic/CP2 identity separation, merchant private-order/settlement/replay/reorg tests, existing daily-market and JS tests, and PHP syntax checks. No payments or tokens were moved during testing.
