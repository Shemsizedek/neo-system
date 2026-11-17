# NEO Counter / Counterpay merchant pilot checkpoint

Project 144, November 16, 2026 (America/Chicago).

## Outcome

This gate fixes a false-positive Counterparty payment observation in a review branch. It does not complete or activate a live merchant payment.

The merchant proposal remains: invite vendors to NEO Counter, use Counterpay as the intended wallet payment connection, and help holders find willing NOMNI vendors or Bitcoin buyers. Bitcoin conversion is optional unless a merchant requires it. Neither the dispenser nor checkout establishes a guaranteed buyer or conversion price.

## Verified evidence

- Source snapshot: `91697f0a1b47d19868b5d156352d0237b6351181`.
- The deployed NEO Counter HTML and its referenced JavaScript bundle returned HTTP 200 at `https://shemsizedek.github.io/neo-system/neo-counter/`. This verifies retrieval, not a completed browser checkout or payment.
- The public Counterparty v2 receive endpoint returned historical NOMNI receipts with no timestamp by default. The same endpoint with `verbose=true` included Unix-second `block_time`, asset divisibility and normalized quantity.
- One observed historical receipt had transaction hash `a1f0356b05053bdb79edb284031645bf77e3627273b88b6cf020919a4ae0c680`, block 626578 and verbose `block_time` 1587229736. It must not satisfy a new order.
- The node root reported ready mainnet status and Counterparty height 976205 during the read. These are dated single-node observations.
- Counterpay's HEAD request returned 200, while the page GET was blocked with HTTP 403. This check establishes neither a working wallet flow nor an outage.

Read-only evidence endpoints:

- `https://api.counterparty.io:4000/v2/addresses/18FyntJG9hdXYvanm67mGgbyo1P7adckvg/receives/NOMNI?limit=1&verbose=true`
- `https://api.counterparty.io:4000/v2/`
- `https://counterpay.holytemples.org/`

## Repair

Previously, the observer skipped old receipts only when it could parse a timestamp. A missing or unparseable timestamp therefore bypassed the freshness filter. The first sufficiently large receipt could become a confirmed payment, even without a transaction hash or checked block inclusion.

The observer now requests verbose receive metadata and checks ready mainnet node state. A pure matching helper requires a fresh, nonfuture receipt for the exact destination and asset, valid status, a full transaction hash, a positive indexed block at or below the observed node height, and a sufficient normalized quantity. Missing evidence leaves the order unmatched. Raw quantity fallback requires explicit divisibility metadata.

This establishes an indexed block inclusion check, not a configurable multi-confirmation policy. The fix does not provide atomic order assignment, cross-order replay protection or independent downstream fulfillment authorization.

## Validation

Using an isolated install of the application's declared dependencies:

- `npm run test:rails`: 12 tests passed, including the historical receipt regression, Unix timestamps, asset/destination mismatch, missing references, underpayment and invalid node state.
- `npm run test:gateway`: existing gateway money assertions passed.
- `npm run build`: TypeScript and Vite production build passed.

No live transfer, signing, broadcast, purchase, merchant invitation or deployment occurred. This checkpoint adds no provider or runtime dependency and does not change production configuration.

## Next unresolved acceptance checks

1. Demonstrate that Counterpay understands the current `neo-counter:` payment payload, or implement and test the appropriate wallet request adapter.
2. Establish the intended merchant-controlled receiving address and its binding to each order. Browser caller parameters remain untrusted.
3. Prevent one receipt from fulfilling multiple orders through authoritative assignment and replay protection. Apply the merchant's required confirmation depth and independently verify the reference before fulfillment.
4. Validate quote expiry and exact NOMNI quantities, including indivisibility and any overpayment/refund agreement.
5. Run a bounded wallet-authorized payment and verify receipt, order reconciliation and fulfillment eligibility. Obtain specific authorization for any new spending before a live transfer.

Owner: NEO Counter maintainers for the source review and payment integration. The sales workstream may continue research and nonbinding invitation preparation without claiming verified merchant settlement.
