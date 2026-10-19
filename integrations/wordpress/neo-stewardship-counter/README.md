# World Currency directory — 0.19.0

The complete current 121-entry catalog is searchable on Holy Stewardship and available in merchant currency setup. Daily positive market pricing and per-ledger treasury checks are required for token quotes. See [WORLD_CURRENCY_ACTIVATION.md](WORLD_CURRENCY_ACTIVATION.md).

# NEO Counter merchant extension — 0.18.0

The plugin now includes a NEO Counter operator menu for product/service draft invoices and separate fulfillment routing. See [MERCHANT_PLATFORM_GATE.md](MERCHANT_PLATFORM_GATE.md) for supported flows and remaining activation requirements. Payments and automatic delivery remain disabled.

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

## Gate 7 — confirmed treasury and Freewallet handoff
User confirmed BTC treasury and token source address 1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8 on 2026-10-17. Plugin v0.6.0 records this address, Freewallet as the designated signer, CONNECTION_REQUIRED signing state and UNVERIFIED Counterparty ledger on newly prepared checkout records. Administrator handoff instructions explain the external wallet signing boundary. Public page reflects the confirmed treasury.

The address is not a key and does not grant server signing authority. Existing public Counterparty servers cannot sign on behalf of this Freewallet address without its authorized signer. Freewallet's official site documents separate Counterparty 2.0 and Classic editions/ledgers; confirm the edition actually used before selecting a node or sending tokens. No ledger is silently assumed.

No payment request, payable QR, token transfer, signer connection or fulfillment verification was enabled by this gate. Treasury confirmation is complete; correct ledger and tested signing/settlement remain outstanding.

## Gate 8 — explicit Classic and Counterparty 2.0 support
Plugin v0.7.0 is installed active. Members explicitly select cp20 or classic before reviewing quotes or preparing checkout. The source map is fixed to cp20.tokenscan.io and classic.tokenscan.io respectively, matching the official Freewallet edition links. No ledger is inferred from the Bitcoin address, and no implicit default is selected.

Server price caches and reference identifiers are ledger-specific. Each supported asset is independently issuer-checked on that ledger. Missing responses do not fall back to tokenscan.io or the other ledger. Form 144 upload requirements apply to both. The server validates ledger selection again at checkout and stores it in the private record for settlement/delivery routing. Browser quote form is explicitly targeted so the ledger selection form cannot intercept quote events.

Quote controller tests passed after adapting the fixture to the dedicated quote form. Public routes were checked for selected explorer identity and absence of cross-ledger price references. Direct API probes returned 403 in the workspace; availability is independently determined by the deployed WordPress server. No token bridge or cross-ledger balance equivalence is assumed.

Support here means isolated selection, source routing and checkout records. Production settlement verification, inventory reservations and signing adapters still need testing separately for each ledger. Payment collection remains disabled. Merchant software does not secure SHA-256 consensus or establish the integrity of Bitcoin installers; package-signature verification and hardened node operations are separate controls.

## Gate 9 — NEOpay-compatible wallet connection
Source inspection found the actual NEO Pay provider contract in src/neopay/signerAdapters.ts and walletProviderRegistry.ts: window.neoBitcoinSigner with connect() and signRawTransaction(). This interface is now consumed by wallet-connect.mjs on the stewardship page; no invented CounterPay-specific global is assumed.

Plugin v0.8.0 is active with a member account connection button and a merchant account connection button visible only to WordPress administrators. Merchant account connection rejects addresses other than the configured treasury. Wallets must explicitly report mainnet; absent network information fails closed. Member delivery address can be filled from the returned account. No wallet secret, persisted connection or automatic transfer is introduced.

NEOpay, CounterPay and other providers can participate when they expose the shared contract in the stewardship page context. Source-level compatibility is not proof that a wallet provider is installed or exposed in the user's current browser. External Freewallet signing is listed separately; it is not falsely marked as a connected browser provider.

Tests passed for fixture connection, missing/incompatible provider, explicit mainnet, treasury mismatch and absence of signing side effects. These are mocked-provider tests. No real wallet account, transaction signature, payment confirmation or token delivery was exercised. Member account connectivity does not authorize merchant inventory signing or establish wallet ownership cryptographically. Payment collection remains disabled.
