# NEO-FLIP-002 — Stale Listing Wholesale Intake

**Operator:** Shelton Estate & Co. (exact legal payee, authorized signers and bank/escrow beneficiary details to verify). **Parent:** NIA-013 NEO Deal Desk.

## Strategy
Target aged active listings, price reductions, and negotiable seller terms. Stale listing age is a *lead signal*, not proof of distress, motivation, comparable value or wholesale margin. Start Houston/Texas; do not buy data, scrape MLS pages without permission, send messages, sign contracts, or place deposits by default.

## Screening
- Research candidates: Texas, active/for-sale listing, >=120 reported days on market, source URL, address and market.
- Automation-ready requires independently refreshed active status within 72 hours and verified source-automation permission.
- Prefer material price reductions; distinguish price reduction from permissible acquisition spread.
- Crawler: connect only to authorized licensed feeds, public agency records or approved provider APIs; HAR search results are manual research leads and do **not** authorize scraping.
- No source input should contain personal phone numbers, emails, unverified owner names, or unconsented outreach.

## Underwriting
Sold comps (>=2) and documented adjusted ARV; independent repair/contingency allowance; closing and carrying/sale expenses; minimum buyer profit; authenticated buyer maximum acquisition budget and buyer funds; real seller-negotiated contract price. Calculate:

- Investor underwriting maximum = ARV - repairs - buyer closing costs - holding/selling costs - contingency - target buyer profit.
- Effective buyer maximum = min(investor underwriting maximum, buyer's verified all-in maximum).
- Assignment spread = effective buyer maximum - negotiated seller contract price.
- Projected net fee = assignment fee - assignor direct costs.

A listing is only **economically screened** when verified evidence fields exist, proposed fee fits spread, and expected net fee >= default $7,500. Being economically screened does not authorize a binding offer, prove contractual assignability, or mark a fee as revenue.

## Receiving proceeds
Receiving money is not an outbound money-movement request, so NEO agent approval for *outgoing transfers* is inapplicable. A title/escrow closer should disburse approved assignment proceeds directly to the verified Shelton Estate & Co. beneficiary per executed closing documents. Never show editable wiring instructions in outbound communications; verify any change via an independent trusted channel. The module records received fees only on a documented settlement statement AND independently verified receipt. Partial fees are not marked fully paid. No autonomous payments, invoices implying a signed deal, or false revenue recognition.

## Next adapters
1. Read-only Deal Desk scout register with proof URLs, source timestamps, evidence quality and dedupe.
2. Licensing/permission-approved listings source and authenticated Harris County record lookup.
3. Buyer opt-in registry and independently verified availability/proof-of-funds.
4. Verified beneficial payee and escrow receipt confirmations.
5. Texas counsel-approved offer, contract, disclosure and assignment packet; authorized NEOpass principal approvals and real e-signature provider.
6. Staging integration tests, monitoring and rollback.

## Test
`node --test server/neo-flipper/stale-listing.test.mjs` plus existing NEO Flipper tests.
All records supplied to pure functions are untrusted claims until separately authenticated and access-controlled.
