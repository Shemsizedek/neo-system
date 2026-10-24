# NEO ECOS onboarding within CLOUD-002

Reviewed: 2026-10-24. This is an offline intake helper, not an ECOS API adapter, provider authentication, deployment, financial approval or completed mining gate.

## Product distinction and current findings

The account-supplied instructions describe connecting an ASIC to a Stratum pool. They do not identify a purchased cloud contract, a Bitcoin receiving address, or observed hashrate. A device-model-like worker suffix must never be interpreted as device ownership or capacity.

ECOS's cloud-mining page currently advertises a starting price of USD 99 [1]. Its FAQ states USD 149, while the linked help article states USD 150 with a USD 100 trial [2, 3]. These conflicting public pages do not establish a USD 10 purchase option. The authenticated account's current plan/order quote must resolve price, eligibility, term, fees and any promotional limitations; do not increase the user's budget automatically. A wallet deposit is not a contract purchase.

The account instructions specify pool.blc.am and an Ecos.<account>.<worker> format. ECOS's public pool page instead specifies pool.ecos.am and wallet-address username authentication [4]. Preserve both as conflicting documentation; neither proves the other is wrong. Do not overwrite a working miner, guess credentials, or probe pool authentication without account-specific confirmation from ECOS. Stratum URLs are not Bitcoin payment destinations.

ECOS's standard Terms of Use, shown as updated January 22, 2025, prohibit sublicensing or transferring service-use rights in section 1.6 and require prior written consent for assignment in section 13.1 [5]. They separately recognize reseller relationships and contain an internal mining-farm marketplace mechanism; neither establishes NEO permission to sell subdivided cloud contracts or tokens. Require an executed agreement explicitly covering NEO's intended resale and customer-entitlement model. This is a release requirement, not a legal opinion about every possible structure.

ECOS documentation lists a 0.001 BTC withdrawal minimum [2, 5, 6]. Its terms restrict withdrawal of promotional hashpower results and describe expiry/purchase conditions [5, sections 1.10.5 and 1.15]. Review account-specific conditions and fees before funding; do not describe promotional balances as received, withdrawable BTC.

## Implemented code

`server/miner-generator/ecosIntake.mjs` performs offline shape validation and separates pool instructions from desired cloud hashrate. It normalizes a full worker or suffix without adding the account prefix twice, rejects mismatched accounts/unsafe URLs, keeps all measurements unknown, and emits a redacted review report. Recognized hostname strings do not verify ownership. No network calls, keys, signing, transaction generation, device restart or purchase operation exists. This helper is not automatically bound into a runtime or checkout.

The real account identifier and worker are only in the user's private downloadable profile, not this repository or its tests. Public tests use fictional identifiers. Deposit, invoice, and verified allocation data remain null. User-supplied flags cannot activate checkout, capacity, token issuance, or reinvestment.

Run: `node --test server/miner-generator/ecosIntake.test.mjs`.

## Project register and decisions

| Work item | Owner / dependency | Status |
| --- | --- | --- |
| ECOS intake parsing and redaction | NEO engineering | Implemented; local tests recorded separately |
| Authenticate actual ECOS account / selected product | Account owner and approved read-only provider integration | Not verified |
| Resolve USD 10 quote, all-in fees and withdrawal rules | ECOS and account owner | Awaiting actual order screen |
| Confirm account-specific pool endpoint/username rules | ECOS support | Required before hardware changes |
| Fund or purchase any provider service | Account owner using their own wallet | No transaction executed |
| Resell ECOS-backed contracts through Counter | Written ECOS permission plus commercial/legal review | Blocked |
| Read-only telemetry and payout reconciliation | Authorized provider evidence and NEO runtime | Not connected |
| NEO Counter order activation and tokens | Verified allocation, payment finality and reviewed customer rights | Disabled |

Decision: ECOS is a new provider onboarding track. NiceHash testnet evidence cannot authenticate ECOS, and this offline intake cannot complete CLOUD-002. Preserve the existing sandbox/verifier work rather than relabeling it as ECOS. No new funded order, broadcast, public account disclosure, production deployment, or APK rebuild is authorized by a successful parser test.

Next milestone: obtain the authenticated ECOS plan/order screen showing price, TH/s, duration, all fees, and payout terms; independently resolve reseller permission before offering a NEO contract. Hardware-pool participation and rented cloud service are separate options, not interchangeable evidence.

Rollback: remove this helper and its tests/documentation; no schemas, runtime routes, financial state or deployed assets were changed.

## Primary sources and retrieval limits

[1] https://ecos.am/en/cloud-mining -- retrieved through Exa on 2026-10-24; advertised starting price, not an account quote.
[2] https://ecos.am/en/faq -- retrieved through Exa on 2026-10-24; published minimum, fee and withdrawal statements.
[3] https://ecoshelp.zendesk.com/hc/en-us/articles/360023744112-What-is-the-minimum-amount-to-invest-in-cloud-mining -- official linked help center; fetched through web and Exa on 2026-10-24.
[4] https://ecos.am/en/mining-pool -- retrieved through Exa on 2026-10-24; public Stratum setup differs from the user's supplied instructions. No pool connection was attempted.
[5] https://ecos.am/en/terms-of-use -- official terms retrieved through Exa on 2026-10-24, with the sections above read from the page/search extraction. No agreement was accepted.
[6] https://ecoshelp.zendesk.com/hc/en-us/articles/4573737798033-What-is-the-minimum-for-withdrawal -- official linked help center; published 2022, retrieved through web on 2026-10-24. Account-specific policy must be reconfirmed.

The standard web fetch was blocked for several ecos.am pages; Exa returned their text. This is public-document review, not a live account session or guarantee of provider performance. Browser account access was unavailable in this conversation. No authenticated $10 offer, API credentials, reseller agreement, funded allocation, actual accepted shares or payout was verified.
