# NEO Counter — simple merchant checkout

## Customer experience

One mobile-friendly payment card shows the merchant name, item/bill reference, exact token quantity and asset, network, merchant receiving address, local QR and payment status. Customers can copy the address/amount or refresh payment status. Terms and fee details sit in a disclosure instead of blocking the main view. No recovery words, private keys, signing or automatic payment action is introduced.

Add `[neo_counter_checkout order_id="123"]` to an existing checkout page after maintainer review. The shortcode checks that the signed-in customer owns that invoice (or is an administrator), then renders the authoritative saved invoice. It does not read invoice terms, prices or recipients from browser query parameters. The existing backend still requires customer accounts; guest checkout is not added by this release.

The independent design preview is `preview/simple-checkout.html`, served from the repository. Its address is intentionally invalid (the example in BIP21); it cannot be used for real payment. The demo simulates NOMNI, BTC, indivisible NEOCASH and invoice states without a live order or wallet connection.

## Merchant recipient

The authenticated operator form now includes required merchant name and receiving-wallet fields. New operator form submissions store that validated receiving address as the invoice destination. The general merchant path therefore need not point at the Temple collection wallet. The server continues ignoring an arbitrary input named `destination`; the explicitly authorized `merchant_wallet` field is accepted only inside the existing administrator-only order-preparation path. This is operator authorization, not cryptographic proof that the merchant controls the wallet.

Existing programmatic callers that omit `merchant_wallet` retain their historical collection destination. Old saved invoice destinations are not rewritten. Holy Stewardship's bond flow is separate and remains unchanged. No merchant receiving address was entered in production during this work.

Address support follows the existing server validator: legacy Bitcoin mainnet P2PKH. Do not imply SegWit, Taproot or other networks are accepted. A future extension must use reviewed checksum/network validation and existing settlement compatibility.

## Exact asset and QR behavior

- Token invoices show the actual Counterparty asset, not just a currency symbol. For example, a currency label alone never turns a token payment into a fiat payment or proves fiat backing.
- Existing World Currency mapping/asset/market checks remain in the backend. Unmapped or unverified currencies cannot silently become BTC. Amounts remain exact strings, including indivisible tokens; the view does not use floating-point conversion for payment amounts.
- BTC QR: `bitcoin:<merchant-address>?amount=<exact BTC amount>`.
- Counterparty QR: the merchant address alone. The adjacent instruction explicitly names the token and exact quantity to enter in a compatible wallet. A token quantity is never encoded as Bitcoin `amount`, which wallets interpret as BTC.
- QR generation uses the vendored MIT Project Nayuki encoder on the device. No third-party QR image service receives the invoice address. A four-module white quiet zone surrounds black modules.

The Bitcoin URI amount semantics are documented in https://github.com/bitcoin/bips/blob/master/bip-0021.mediawiki (superseded by BIP321; legacy format remains used here for compatibility). No unsupported universal Counterparty amount URI is invented.

## Status and existing payment hold

The view distinguishes Not ready, Awaiting payment, Confirming, Paid and Expired. Unknown/review states cannot expose a payment QR. Confirming/paid states hide the QR to discourage duplicate payment. A paid label comes only from an authoritative backend `PAYMENT_CONFIRMED` state, never a redirect or `success` query string. Delivery remains separate from payment.

The installed system currently advertises payments disabled. The new shortcode preserves the same `payable:false` envelope as the existing REST invoice route. It does **not** activate an order, accept terms, issue tokens, pay a merchant, finalize delivery or turn on payments. Both backend invoice activation and customer acceptance remain required before any future live QR release. There is no new public invoice route or open customer-controlled recipient field.

Refresh is a same-origin authenticated GET of the existing invoice route. It does not invoke the settlement-writing verification POST, submit a transaction ID or auto-discover a payment. Existing operator verification/watchers remain responsible for payment evidence. Status refresh cannot detect a transfer the backend has never been told to inspect. Adding a customer transaction-ID submission flow is a separate bounded integration.

The existing 9% markup and World Currency pricing rules are unchanged. The invoice total is primary; existing markup is disclosed in order details and Bitcoin network fees are identified as separate wallet charges. No claim of a new pricing policy, rate guarantee, guest checkout, automatic fulfillment, or universal wallet support is made.

## Validation

- 25 JavaScript tests pass across the plugin's existing suites and new checkout tests.
- All PHP test scripts pass using PHP 8.4.27 with SQLite/PDO, including direct merchant recipient, legacy collection compatibility, authorization, invoice integrity, exact amounts, replay/reorg and shortcode JSON escaping tests.
- Changed PHP files pass syntax checks.
- Independently decoded token-address and BTC-URI QR round trips pass using jsQR; DOM checks confirm local SVG rendering, inert merchant text and no paid status from a success URL.
- `git diff --check` passes.
- Live desktop browser QA passed on the published preview: NOMNI/BTC controls render, Paid hides the QR and disables copy, and the customer page displays its sign-in card. The existing Temple welcome overlay must be dismissed before viewing the card. Actual mobile device visual QA remains outstanding.

## Deployment and rollback

NEO Counter 0.22.0 was installed and activated on holytemples.org on 2026-11-08 under the user's explicit “Go live” authorization. The customer page is published at https://holytemples.org/neo-counter-checkout/ (WordPress page 3832). The source remains on the feature branch in PR #1352; no own-PR merge occurred. A fresh plugin inventory confirms 0.22.0 active. The settlement status endpoint retains its hardcoded 0.21.0 API contract label and reports paymentsEnabled:false and automaticDelivery:false.

Published preview: https://holytemples.org/wp-content/plugins/neo-stewardship-counter/preview/simple-checkout.html . Its intentionally invalid address and synthetic invoice must never be used for payment. The real customer page requires sign-in and an owned invoice; no live customer order, wallet or financial transaction was created during deployment.

Release source commit: d2783cd5d08bc57c27b423e0b8cf0bb5a1383d0b.
Release ZIP SHA-256: 9cbb2ee52db5ba2ea975b6c711239513c9bb2e3eb07c0905640da0dfff6050cd.

Before replacement, Jetpack reported its latest successful backup at 2026-11-08 12:33:23, with managed credentials active and no failed backup attempt. A rollback ZIP was prepared from the prior 0.21.0 source commit 694d20ce454758f0468de9d2a945d4f007e6e55f; its SHA-256 is 622e76a1cc36969579dbe76a7ab9a818312c263dc0028d4dc339f064122c04a1. This source package is not asserted to be a byte-for-byte copy of the former installation. Rollback restores that prior source release and unpublishes page 3832 if the shortcode is removed. No schema migration is introduced.

Next gate: complete mobile visual QA, remove the unrelated welcome overlay from checkout through its owning integration, verify merchant wallet authority and bounded synthetic invoice/settlement evidence, then implement explicit invoice activation before enabling actual payment instructions. The deployed shortcode intentionally preserves the global payment hold. Do not label the release as accepting live payments or supporting all currencies/wallets.
