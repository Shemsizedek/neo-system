# Holy Stewardship NEO Counter — Gate 1
Target: https://holytemples.org/holy-stewardship/
Service identifier: holy-stewardship

## Install
Install neo-stewardship-counter.php as a WordPress plugin in a staging environment. Activate it and insert a core Shortcode block containing:
[neo_stewardship_counter]

The shortcode renders only on the holy-stewardship page. Inline scripts must be permitted by the site's CSP. No external dependencies or network requests are used.

## Gate 1 behavior
- Temple citizens: PLEDGEBOND patronage preview.
- New apprentices: PLEDGEBOND preview and request-protection-information path; no application is transmitted.
- Adepts: TEMPLEBOND commitment preview.
- Whole-token quantities only for the preview; final allowed precision must come from verified asset metadata.
- Native required consent and quantity validation; accessible status output.
- No collection of identity, no payment addresses, no live gateway redirect, no storage, no order submission.
- Preview edits clear the previous result.
- Existing page content is not changed by this branch.

## Live integration prerequisites
Confirm token issuer and current asset metadata, prices and denomination, receiving treasury wallet, inventory and token-delivery authorization, eligibility, complete instrument terms available before consent, refund policy, and settlement confirmation requirements. The existing public page is not proof of insurance coverage, tax status or regulatory approval.

Apprentice protection must have a separately defined provider, coverage/benefits, exclusions and eligibility before any activation representation.

Use the existing apps/neo-counter/src/gateway/intent.ts contract rather than inventing a checkout endpoint. amount is positive integer fiat minor units; asset and asset_amount describe the token selection, not automatically the payment rail. Create and persist an authoritative server-side order before a live redirect. Never derive price, eligibility or treasury details from browser parameters.

Return URLs must resolve to this stewardship flow. Browser success parameters are untrusted. Independently verify payment asset/network, destination, amount, transaction uniqueness and required confirmations. Track payment settlement separately from token delivery, member recognition and any separately issued protection.

## Validation
JavaScript syntax checked with Node. WordPress/PHP runtime, Block Editor insertion, mobile rendering and deployed checkout have not been tested. PHP is unavailable in the build workspace.

## Staging acceptance
Verify shortcode absent on every other page; all three paths; required checkbox; zero, negative, fractional and excessive quantities rejected; selection edits clear output; keyboard/mobile usability; no network payment request or sensitive data collection.

## Gate 2 — market reference and fee calculation
pricing.mjs implements integer arithmetic for:
market subtotal + disclosed spread + fixed fee allowance + percentage fee gross-up + upward rounding.
Rates, fee allowances and rounding increments are configurable inputs; no production markup or fee value has been assumed. Percentage fees are calculated against the final rounded total. BTC uses satoshis, XCP uses atomic units, USD uses cents. Cross-currency conversion must happen upstream with its own verified reference and conservative rounding. A positive per-token integer reference is required; fractional atomic-unit rates need a future rational-price adapter.

Sources discovered from the actual TokenScan asset page:
- https://tokenscan.io/api/asset/TEMPLEBOND
- https://tokenscan.io/api/asset/PLEDGEBOND
- https://tokenscan.io/api/network (BTC/XCP USD conversion panel)
The page reads market_info.btc.price, market_info.btc.floor, market_info.xcp.price and market_info.xcp.floor.
Direct API reads returned HTTP 403 in this environment on 2026-10-17. No current rate was verified or embedded. Static HTML zero placeholders must never be accepted as prices. Do not bypass source access controls.

A future server adapter must verify upstream observation time (retrieval time alone is insufficient), issuer, currency, unit precision and provenance. Do not treat a floor/last-trade reference as an executable offer or guaranteed inventory. Reject unavailable, zero or stale prices. Reference preview expires within five minutes; live quotes must also reserve inventory and persist an authoritative order.

The calculator is built and tested but is not wired into the WordPress shortcode or deployed. All results remain non-payable reference previews.
Run: node integrations/wordpress/neo-stewardship-counter/pricing.test.mjs
Validation passed: itemization, rounding, fee gross-up, invalid values, stale references and 100 fee-coverage scenarios. Fixture values are synthetic, never live market rates.
