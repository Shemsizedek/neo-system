# NEO Cloud Miner / NEO Generator - release candidate 0.1.0

## Outcome and scope

Project 144 now has an additive cloud-first consumer web surface at `public/neo-cloud-miner/` and an Android preview companion at `apps/neo-generator-android/`. Rented cloud hashrate is an alternative to owning an ASIC; the prior physical-miner pilot is not a prerequisite for developing this interface.

This candidate does not represent funded hashrate, a provider partnership, verified pool shares, BTC revenue, active customer contracts or token issuance. It is not commercially activated or certified retail-ready. Local plan drafts and official provider links work without an account. The Android app bundles the same assets and opens external services in the system browser.

## Project register

| Workstream | Owner / dependency | Candidate status |
|---|---|---|
| Consumer web UI | Project 144 / NEOsync | Implemented; responsive overview, plan builder, local draft storage/export, connections |
| NiceHash adapter | Server-side integration / account credentials | Implemented GET-only client; default testnet; no account connection claimed |
| NEO Counter | Existing checkout gateway / verified payment service | URL adapter follows existing contract; purchase actions locked |
| World Currency | Approved rails, current pricing and settlement verification | BTC/XCP/NOMNI/USD hints preserved; USD is manual/display only per existing docs |
| Security Wallet token | Verified issuer wallet, exact existing asset ID, rights and legal review | Unverified public reference only; no mint/sign/send code |
| Android | Android SDK build / stable production signing identity | Evaluation APK pipeline; minimum Android 8 / API 26; target API 35 |
| Deployment | Existing canonical `.github/workflows/pages.yml` | Additive public route; production verification must be recorded separately |

## Official-source provider research (checked 2026-10-23)

- NiceHash official client documentation: https://github.com/nicehash/rest-clients-demo . It documents `https://test.nicehash.com` and `https://api-test.nicehash.com` for testnet development without real funds. Account access and availability still require verification. This is not free sellable mainnet hashrate.
- NiceHash API: https://www.nicehash.com/docs/ . Credentials stay server-side. The shipped client has only public market reads, private order-list reads and private order-statistics reads. It has no purchase, refill, trade, transfer or withdrawal methods.
- Bitdeer sales-agent program: https://www.bitdeer.com/cloud-mining/cooperation . It describes agent-owned sales channels. This is a partnership candidate, not an established NEO agreement or a free development service.
- BitFuFu pool documentation: https://help.bitfufu.com/en/article/bitfufu-pool-mining-tutorial-1m68u73/ . Pool observers are not resale/tokenization permission. No free developer sandbox was verified.
- ECOS: https://ecos.am/en/cloud-mining . Promotional trials and profit calculators are not confirmed developer APIs or guaranteed profit. No free NEO development entitlement was verified.

## NEO Counter and financial boundaries

The existing `docs/NEO_COUNTER_CHECKOUT_GATEWAY.md` is the integration contract. `createCounterCheckoutUrl` is a presentation adapter for a server-created order, not settlement verification. Browser query parameters, local storage, a redirect return, and a displayed currency name never activate contracts.

Release 0.1.0 has no live purchase handler. Actual activation requires server-side authentication, immutable priced order terms, verified supported currency/payment rail, independent reconciliation, idempotency, capacity reservation, provider resale permission, refunds and jurisdiction-appropriate compliance review. All pricing/expected BTC fields remain unknown rather than fabricated.

A pool share is evidence of work at a specified difficulty, not a transferable BTC balance. Any token must explicitly define its contractual rights and be bound to an authorized issuer and existing asset identity. Pool work, BTC receipts and token entitlement must remain separate records. Revenue-linked or transferable mining tokens need specialist review of their economic substance before sale. The SEC's protocol-mining staff statement is not blanket clearance for tokenized retail investment products: https://www.sec.gov/newsroom/speeches-statements/statement-certain-proof-work-mining-activities-032025 .

## Configuration and integration checklist

- [ ] Verify NiceHash sandbox account, organization ID and read-only API key.
- [ ] Store `NICEHASH_TEST_API_KEY`, `NICEHASH_TEST_API_SECRET`, `NICEHASH_TEST_ORGANIZATION_ID` in a server secret manager; never in browser, APK, GitHub source or chat.
- [ ] Execute `niceHashDevelopmentStatus()` from a private diagnostic and retain sanitized evidence.
- [ ] Confirm provider terms permit NEO's proposed resale and token entitlements.
- [ ] Bind an independently authenticated pool observer and testnet sample work; testnet must remain visibly separate from mainnet.
- [ ] Implement authenticated customer accounts, verified quote API, atomic allocation, payment reconciliation and refunds before opening checkout.
- [ ] Verify Security Wallet ownership and exact token ID; obtain approved entitlement, custody, transfer and redemption rules.
- [ ] Supply a stable privately held Android release-signing key; do not use the evaluation certificate for public retail distribution.
- [ ] Test on the intended phone and independently probe the deployed HTTPS route.

## Validation and packaging

```sh
node --test server/miner-generator/cloudRetail.test.mjs
bash apps/neo-generator-android/build.sh
npm test
npm run build
```

Android build output: `build/neo-generator-preview/neo-generator-0.1.0-preview.apk`, checksum, certificate-verification output and build metadata. The keystore is temporary and excluded. A later preview generated with another temporary certificate may require uninstalling the previous preview; export drafts first. No physical-device or emulator test is implied by compilation/signature verification.

Native security: HTTPS asset origin with an exact asset allowlist, no JavaScript/native bridge, no cleartext traffic, no arbitrary file access, no background services, no camera/contacts/storage permissions, no wallet signing. Internet is the only requested Android permission. External links are host-allowlisted and open in the system browser.

## Decisions and next milestone

- Cloud-first development: use documented testnet APIs instead of requiring the user to own an ASIC.
- No invented earnings, fees, prices, live balances, token ownership or partnerships.
- Public UI deployment is separate from financial activation.
- Existing canonical GitHub Pages workflow retains deployment ownership; no alternate deployment authority is introduced.

Next milestone: prove one authenticated sandbox provider account, establish a permitted provider-to-customer allocation model, and demonstrate a server-verified NEO Counter test payment without treating testnet as real BTC. Production buying, token issuance and customer sales remain unavailable until their own gates pass.

## Rollback

This change adds new files only; it does not merge the earlier physical-fleet feature branches. Remove the new public route from a future deployment or revert the additive release commit to withdraw the interface. No live financial records or wallet state are migrated by this release.
