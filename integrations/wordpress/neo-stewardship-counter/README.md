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
