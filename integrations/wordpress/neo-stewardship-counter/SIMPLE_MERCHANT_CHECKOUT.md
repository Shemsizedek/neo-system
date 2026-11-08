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
- Cloud browser could not connect to the local preview server (`ERR_CONNECTION_REFUSED`). Actual desktop/mobile visual QA remains outstanding; DOM checks are not visual screenshots.

## Deployment and rollback

This is a feature-branch change against the existing `feat/holy-stewardship-counter-gate1` source branch. Plugin version 0.22.0 is prepared only, not deployed. Maintainer review is required by the repository's `AGENTS.md`; the contributor does not merge its own PR or deploy production workloads. No live order, address, setting, page layout or payment capability was changed.

After review, preview on staging with synthetic orders and verify mobile layout, copy behavior, locked/expired handling and access isolation before deploying. Preserve all existing files/assets and create a plugin backup. Rollback restores the prior plugin version and removes the newly added checkout shortcode from any newly configured page. No schema migration is introduced; existing saved invoice payloads remain readable.
