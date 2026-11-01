# Project 144 — FWKF Gate 015: reciprocal sites, KNOWINDEX metadata and Crown evidence feed

**As of:** 2026-11-01  
**Workstream:** World Café Events / Free World Knowledge Foundation / Holy See Global District / KNOWINDEX  
**State:** Web descriptions updated and independently verified; KNOWINDEX evidence crosswalk public; read-only Crown feed tested. No token update, chain signing, issuance, trade, or protected knowledge write.

## Decisions and terminology

1. **World Café Events** is the event/conversation/knowledge-sharing program, **not a district** and not a claim that a physical restaurant is operating.
2. **Holy See Global District** is the district context supplied by the project sponsor. It is distinct from the separate Global Institute School District (GISD) educational program.
3. **World Temple City** is the present city-development information source; **Nu Cities of Peace** are additional projected development concepts of World Temple. Neither unbuilt property nor any announced event dates or development permits are inferred.
4. Free World Knowledge Foundation at `worldcafe.holytemples.org` can exchange **public, permission-reviewed knowledge metadata** with NEO's KNOWINDEX and Crown Chain planning layers.
5. The Bitcoin/Counterparty asset is described by public indexers; asset existence does not prove shareholder or intellectual-property rights, authorized operator signing, or a new tokenized knowledge-data transaction.

## Reciprocal public site changes

- Foundation HTML source: `apps/fwkf-worldcafe/public/index.html`. Corrected the hero, city/program cards, World Café Events section, navigation, KNOWINDEX explanation, and deprecated the “World Café District” display and 11-district counter. Linked World Temple City, the World Library, the public KNOWINDEX JSON contract, methodology and Counterparty explorers.
- World Temple City page (WordPress.com ID 3040): revised introduction to identify Holy See Global District and planned Nu Cities of Peace; changed the World Cafe card from “Coming soon physical venue” to a linked live Foundation event/knowledge program; corrected roadmap and linked KNOWINDEX data/World Library/asset information. Changes used one Gutenberg group block with optimistic locking and returned no content warnings.
- The existing Global Institute School District material is preserved as a distinct education program. Other World Temple content was not rewritten.

## KNOWINDEX data reference

Published `https://worldcafe.holytemples.org/knowindex.json` with **eight methodology codes**, NK-01 through NK-08, from `server/crown-metadata/knowindex/METHODOLOGY.md`. NK-08 tracks documented licensed knowledge, paid teaching/research and verified receipts; **no token market cap, projected revenue or financial valuation** is counted as knowledge-economy receipts. All observation values are **null** until source-backed, authorized, defined measurements are available. This is **not** the external UNDP/MBRF GKI score dataset.

Two public Counterparty indexers observed `KNOWINDEX`:
- `https://tokenscan.io/api/asset/KNOWINDEX`: reported asset ID **2197274275635**, supply **1,000**, indivisible, unlocked, issuer/owner address indexed publicly, and description “Free World Knowledge Foundation Knowledge Index for the Global Knowledge Economy”.
- `https://xcp.io/asset/KNOWINDEX`: reported asset created **2026-10-20**, block 972381, supply **1,000**, indivisible, currently unlocked, one indexed holder. These are indexer snapshots, not independently validated Bitcoin-node proof or wallet-control verification.

The live `KNOWINDEX` on-chain description was **not changed**. The repo draft `server/crown-metadata/knowindex/KNOWINDEX-info.draft.json` now points its canonical website to `https://worldcafe.holytemples.org/#index` and links the World Library, data contract, World Temple City and explorers for future operator review. An existing Crown icon endpoint `https://crown.holytemples.org/assets/KNOWINDEX/icon.png` returned 404 during this gate; no public media claim depends on it.

## Crown Chain integration boundary

Added:
- `server/crown-metadata/knowindex/fwkf-evidence-feed.draft.json`: immutable draft configuration; runtimeEnabled **false**, bitcoinAnchoringEnabled **false**, contributionWritesEnabled **false**.
- `scripts/inspect-fwkf-knowindex-feed.mjs`: allowlisted public HTTPS GET, 64-KiB bound, validated indicator codes/values and corroborated explorer metadata; read-only result shape, no database, signing, issuance, fund movements, or network write calls.
- `tests/inspect-fwkf-knowindex-feed.test.mjs`: synthetic tests reject invented index values/asset control states; **3 tests passed**, and read-only live feed check completed on development hardware. This testing device is **not a runtime dependency** for the live site.
- `.github/workflows/fwkf-knowledge-federation.yml`: source-only CI with read permissions, no external credentials, no chain writes.

**Operational truth:** The Crown Chain is **feed-ready for review** via the tested adapter, but its production runtime does **not** yet ingest, commit, sign or publish these observations. The KNOWINDEX KI-022 production contribution-authorization gate is still blocked pending real issuer/role/IAM/storage/dual-approval proof.

## Publication, privacy and compliance

- Current public website retains `noindex,nofollow`; public pages are readable via their URL, not declared fully launched/indexable.
- Contact submissions, grant/fund/token sales and unauthorized registration remain disabled.
- No protected World Library content is exposed by the index contract. Public hash commitments may still reveal sensitive information; review consent and preimage risks before any public anchor.
- No legal conclusions are drawn from the Counterparty asset; claimed initial 1,000 “shares” require governing legal rights documents before economic/shareholder language.
- No new paid hosting, domain purchase, Bitcoin broadcast, chain fee, token description update, KEY access, NEOpass credentials, IAM or Crown Chain production writes made.

## Next gate — FWKF-016

1. Define approved measurement scopes, contributor consent and steward/curator permissions; populate **one** independently verified NK-01/NK-08 sample in a nonproduction branch without private records.
2. Obtain approved issuer/controller documentation and a true live chain proof for KNOWINDEX before updating published asset metadata or asserting rights.
3. Establish a signed, auditable, opt-in source→NEO Crown Chain ingestion flow; keep chain output disabled until KI-022 gates and operator/security authorizations clear.
4. Restore the original React/27-image design through cloud-only transfer if exact visual fidelity is desired; review copyrights before indexability.

## Final live activation and test receipt

- Render deployment `dep-dbjp6jc9v7es73apagng` reported `live` for commit `d6741fbcaefc56bbef60d63de5a89c34b8b85b72` including the updated Foundation HTML/JSON; subsequent unrelated source docs and CI commits do not require a content redeploy.
- Independent fresh-fetch of `https://worldcafe.holytemples.org/`, `https://worldcafe.holytemples.org/knowindex.json`, and `https://holytemples.org/world-temple-city/`: all returned HTTP **200** on HTTPS. Cross-links, World Café Events, Holy See Global District, proposed Nu Cities of Peace, KNOWINDEX and explorer source were present; old "World Café District" wording absent.
- The `inspect-fwkf-knowindex-feed.mjs` test suite passed **3/3**. An initial live probe encountered deployment propagation/cache mismatch, so was not counted as pass. Following fresh readback from both Render and Neon and retry of the exact live inspector, the output reported `counterpartyExplorerRecordObserved:true`, `counterpartyReportedAssetId:2197274275635`, `counterpartyReportedSupplyUnits:1000`, `crownChainWritesApproved:false`, and `permittedAction:read_only_review`; exit code **0**.
- Web hosting is entirely cloud-based (WordPress DNS → Neon Function → Render static origin). Development machine was used for test execution only, not serving the site.
- Gate 016 blocker issue: https://github.com/Shemsizedek/neo-system/issues/1297
