# Holy Stewardship NEO Counter — Gate 4
Target: https://holytemples.org/holy-stewardship/
Service: holy-stewardship
Plugin: neo-stewardship-counter/neo-stewardship-counter.php, version 0.4.0

## Deployment
Plugin uploaded and activated on holytemples.org on 2026-10-17. A core Shortcode block containing [neo_stewardship_counter] was inserted at index 37 of page 2010, immediately after the Indenture using optimistic locking. Existing sections were preserved. WordPress returned no content warnings.

All five runtime files must be installed together: neo-stewardship-counter.php, market.php, checkout.mjs, pricing.mjs and form144.php. The shortcode renders only on the holy-stewardship page.

## Member flow
Exactly two options: PLEDGEBOND: member patronage; TEMPLEBOND: Adept commitment. A whole-token preview quantity and required acknowledgement lead to an itemized non-payable quote. No order, token holding, member recognition or insurance activation occurs. Form 144 submissions contain personal data and are stored privately.

## Market adapter
market.php performs server-side HTTPS reads against:
https://tokenscan.io/api/asset/TEMPLEBOND
https://tokenscan.io/api/asset/PLEDGEBOND

It validates asset identity, issuer 1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8, decimal BTC reference and positive price. Requests have a six-second timeout, no redirects and a 64 KiB response limit. Successful snapshots cache for 60 seconds. Each snapshot expires after five minutes.

The source's market_info.btc.price is used as a market reference, not its floor. BTC amounts use integer satoshis; no USD conversion is needed. Source retrieval time is explicitly labeled as retrieval time. TokenScan does not provide underlying trade time in this response; this feed cannot establish trade freshness, executable liquidity or inventory.

Previously blocked requests returned HTTP 200 during this gate. Both assets were also successfully fetched by the deployed WordPress server.

## Provisional preview pricing
2% market spread plus a 2,000-satoshi estimated fee reserve; round total upward to the next 1,000 satoshis. Percentage processor fee is zero because none is configured. These are provisional preview settings, not verified settlement costs or a guarantee of covering all fees.

The PHP filter neo_stewardship_quote_references can override server-side references and pricing inputs. Never use browser parameters to authorize production prices or treasury destinations.

The calculator supports percentage fee gross-up against final rounded total, itemizes every component, clears edited results and expires displayed quotes. Missing, malformed and expired references fail closed.

## Validation
- Previous arithmetic and controller tests passed, including 100 fee-coverage scenarios.
- WordPress activation succeeded and public HTML contains both market references.
- Deployed checkout.mjs returned HTTP 200 with application/javascript MIME type.
- Live snapshot payloads parsed successfully; one-token previews computed as 63,000 sats TEMPLEBOND and 53,000 sats PLEDGEBOND at the retrieved snapshot. These values are historical test observations, not fixed prices.
- Browser plugin connection timed out, so full interactive browser and mobile visual checks remain unverified.

## Remaining live checkout requirements
Authoritative server-side orders; confirmed treasury wallet and inventory/delivery authorization; actual transaction fee estimation; pre-purchase complete terms and refund policy; independently verified payment asset/network, amount, destination, unique transaction and required confirmations. Track payment separately from token delivery, membership recognition and separately issued protection.

Browser success parameters are untrusted. The existing NEO Counter gateway in apps/neo-counter/src/gateway/intent.ts must not be used as settlement proof. No live payment action exists in this plugin.

## Rollback
Remove the added shortcode block from page 2010 and deactivate only neo-stewardship-counter. Existing page sections remain intact.

## Gate 5 — mandatory Form 144
Calculator moved below the complete Indenture block. Both options require a received Form 144 submission before quote review. Members use the existing WordPress sign-in; no separate NEO Pass integration is assumed.

The form links to the supplied official Form 144 and membership instructions. Authenticated members submit a PDF (maximum 2 MiB) through a nonce-protected admin-post action. Server checks upload status, actual upload origin, size, extension, PDF header and EOF marker. PDF contents are saved as protected post metadata under a non-public, non-REST private custom post type, never under a public uploads URL or public attachment. No PDF is put on a blockchain. Administrators with manage_options can download via a nonce-protected attachment endpoint. Basic PDF envelope checks do not certify document content or scan it for malware; downloads use attachment disposition and nosniff.

Upload receipt is pending review, not verification of completed fields, authenticity, eligibility or membership approval. The signed-in member's own private submission enables the preview; anonymous visitors see a login link and disabled review button. Live payment remains absent and would need independent server-side membership enforcement.

Validation: controller tests pass with submitted-member fixtures and a missing-submission blocking test. Deployed public HTML confirms the calculator follows the Indenture, exactly two options, official Form 144 links, login prompt and disabled review. WordPress reports v0.4.0 active. Actual signed-in PDF submission and administrator download have not been exercised with a member's document.

## Gate 6 — wallet scanning and Indenture checkout preparation
Plugin 0.5.0 installed active on the live page. Both permanent TokenScan links appear with TEMPLEBOND above PLEDGEBOND. PLEDGEBOND uses the canonical asset URL without a trailing period.

Members with a received Form 144 can scan or paste a delivery address, select one of the two instruments, acknowledge the displayed Indenture and prepare a private server-side checkout. Only mainnet legacy P2PKH delivery addresses are enabled at this gate; PHP validates their full Base58Check checksum. BarcodeDetector camera support is optional; manual paste remains available. Camera tracks stop when scanned, cancelled, errored or leaving the page. Camera operation itself remains untested.

payment.php registers private non-REST administrator-managed checkout records. A nonce-protected authenticated action enforces Form 144 receipt, asset/quantity/wallet checks, current market reference and exact current Indenture hash. It saves a server-calculated amount, delivery wallet, the exact Indenture block/version and acknowledgment timestamp. The 10 BTC reference limit prevents arithmetic overflow and oversized draft checkouts.

These records are PREPARED_NOT_PAYABLE with payment NOT_REQUESTED and delivery NOT_STARTED. They do not issue a BIP21 request, generate a payable QR, collect money, sign/broadcast transactions, certify legal satisfaction, or claim token delivery. The current existing NEO Counter rails are read-only observers; they do not supply a signer.

To activate live collection, confirm a treasury receiving address separately from the token issuer address, connect an authorized funded token signer/delivery service and implement/test authoritative invoice allocation, payment confirmation, inventory reservation, idempotent delivery and recovery/refund handling. Full operative terms must be available before live payment. No private keys belong in the plugin.

Tests passed for wallet QR address parsing, Bitcoin URI extraction and invalid input rejection. Deployed public HTML verified for ordered asset links, membership gate, scanner import and accurate payment status. Actual signed-in order creation, payment observation, signing and fulfillment remain unverified.
