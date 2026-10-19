# NEO Counter 0.18.0 — merchant order foundation

NEO Counter is already a WordPress plugin. This release expands it into a merchant foundation rather than installing a second competing checkout plugin. No WooCommerce dependency is required. This is not a complete replacement for WooCommerce's catalogue, cart, shipping, tax, download, refund or dispute systems, and is not a released WooCommerce gateway.

## Payment and fulfillment

| Order | Incoming payment | Outgoing obligation |
|---|---|---|
| Token purchase | BTC or supported Counterparty asset to merchant collection | Exact token/quantity to the buyer wallet |
| Digital product | BTC or supported Counterparty asset to merchant collection | Private download or account entitlement |
| Physical product | BTC or supported Counterparty asset to merchant collection | Shipment; payment is not delivery |
| Service bill | BTC or supported Counterparty asset to merchant collection | Receipt/bill settlement; service completion remains separate |

Collection remains 18SzD3cfwCcV9p6C38ho4uZPHE8ygVB9iq. The existing bond inventory source remains 1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8. A collection address receives payments; it does not need outgoing signing authority just to recognize receipts. Token sales require an inventory release mechanism. A third wallet is optional segregation, not a substitute for a signer or protocol escrow.

WordPress administrators now have a NEO Counter menu to prepare private digital-product, physical-product and service-bill drafts for an existing member. They enter BTC/XCP prices as decimal strings; amounts are converted exactly to atomic units and 9% is added with one upward rounding. These first merchant drafts accept BTC/XCP only. The existing Holy Stewardship world-currency pricing and two bond options are unchanged. Price, collection, payer, ledger, terms and fulfillment type are immutable invoice data. A member cannot set prices. An operator creating a draft does not constitute member acceptance.

Payment claims and fulfillment jobs commit in one transaction. One payment cannot be reused by another order. Jobs now record fulfillment_kind. Product/service jobs never reserve token inventory. Late payment, reorg and unactivated drafts remain held. There is no external fulfillment callback inside a database transaction. No token, download, shipment or service fulfillment is dispatched by this release.

## Tokenworks settlement contract

The code distinguishes merchant_wallet inventory from protocol_escrow and utxo_offer. All escrow plans explicitly report onChainEscrowVerified=false, adapterConnected=false and canExecute=false until a real adapter verifies and binds the on-chain evidence. Choosing a mode never creates escrow.

Counterparty's native DEX escrows the offered token and matches public orders, permits partial fills and has expiry rules. It is an exchange mechanism, not proof that a physical item was delivered. BTC order matches require their own BTCPay handling. It cannot be attached to the merchant send-payment verifier as though it were an ordinary token send. Classic and CP2 need separately tested adapters.

UTXO atomic swaps are a possible CP2 exchange adapter; this release rejects assuming that capability for Classic. Do not attach assets or sign an offer without exact output and spend-policy validation. Merchant collection and digital-product fulfillment do not become atomic simply because a swap exists elsewhere in the system.

CounterTools' published API provides data services; no documented escrow-creation/release endpoint was established during this gate. Tokenworks must integrate actual Counterparty protocol calls or a verified provider, rather than relabel CounterTools analytics as custody. Tokenly SwapBot is a useful prior merchant pattern. Isolated settlement, deadlines and delivery-versus-payment are useful patterns from other ecosystems; external-chain contracts are not deployed or bridged into Bitcoin by this work.

References:
- https://docs.counterparty.io/docs/advanced/protocol/
- https://docs.counterparty.io/docs/advanced/how-to/atomic-swap/
- https://www.countertools.io/docs/api
- https://github.com/tokenly/Tokenly-Tools-and-Services
- https://developer.woocommerce.com/docs/features/payments/payment-gateway-api
- https://solana.com/news/solana-foundation-launches-solana-dv-p-an-atomic-settlement-program-built-for-financial-institutions

## Activation work still required

All live invoices created by this release remain LOCKED_NOT_PAYABLE. No checkbox or posted parameter can enable collection. A real catalogue/customer acceptance flow, pre-payment inventory reservation, secure signer or verified native protocol adapter, durable delivery/reconciliation worker, digital-delivery adapter and funded end-to-end test remain outstanding. Refund and dispute authorization need their own auditable flow; a transfer to a merchant wallet is not reversible escrow. This gate does not move funds or solicit keys.

Tests cover merchant authorization, private member-owned records, duplicate-request cleanup, fixed collection address, exact price conversion and fee bounds, independent member acceptance, four fulfillment types, late/reorg holds, token escrow capability limits, service-payment claim/queue idempotency, absence of token stock reservations for bills, and operator form nonce/capability rendering. The existing settlement SQL/rollback and daily-market/JS tests also pass. The SQL harness uses SQLite; it does not simulate InnoDB concurrency scheduling.
