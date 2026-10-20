# Invoice and BTC confirmation layer — 0.16.0

New prepared checkouts create an immutable, hashed invoice with order/member IDs, currency asset and precision, atomic amount, 9% pricing reference, Indenture hash, source/destination wallets and selected Counterparty ledger. A per-submit UUID is bound to the member by a unique database key. Duplicate submit attempts cannot create a second invoice under that key. Old prepared records are not silently converted.

The browser quote must still be fresh when accepted. The locked invoice then has a 30-minute first-confirmation window, distinct from the five-minute quote acceptance lifetime. BTC confirmations require three blocks. Payments mined outside the window go to review; broadcasting before the deadline alone is not sufficient under this conservative policy.

## Database
Three custom InnoDB tables hold invoices, globally unique transaction claims, and one delivery record per invoice. Claim, invoice update and delivery hold are committed in one transaction under an invoice row lock. A rollback-only installation probe checks unique transaction claims, one claim per invoice, one job per invoice and that no probe rows remain. No fake payment/order is persisted by the probe.

An invoice GET is restricted to its member or an administrator. POST verification is administrator-only, using WordPress REST authentication/nonces. Payment results cannot be supplied by browser JSON: the endpoint accepts only the order ID and transaction ID and obtains observations server-side.

## BTC verification
- Fixed Blockstream and mempool.space HTTPS Esplora endpoints. Both must agree on inputs, outputs, transaction status and the canonical block hash. The lower chain height determines confirmations; a height difference over two blocks causes a hold.
- Exact single collection output and amount; underpayments, overpayments and multiple collection outputs do not automatically match.
- Every funding input must belong to the invoice's receiving/paying wallet. Exchange-funded and multi-party payment transactions are not supported by this first route.
- Preexisting payments, late mining, future block-time anomalies, indexer disagreement and reorgs are held for review. A previously claimed payment cannot be reused across invoices or ledgers. One transaction per invoice; batch payments are not supported.
- Once an administrator submits a matching pending transaction ID, WP-Cron polls confirmations. It is traffic-triggered, not a guaranteed always-on scheduler. Monitoring stops after the first-confirmation deadline plus three hours; there is no active treasury worker yet. A future delivery worker must independently recheck payment immediately before broadcasting.

## What this release does NOT activate
Invoices remain LOCKED_NOT_PAYABLE. Verified funds, if an administrator checks an unsolicited payment, become PAYMENT_REVIEW_REQUIRED with a HOLD_TREASURY_SETUP job. No signing, broadcast, refund, inventory reservation or token delivery occurs. The admin button reports verification and never represents a delivery authorization.

Counterparty token payments require an asset-aware ledger verifier; Bitcoin dust cannot settle NOMNI, XCP or another token invoice. Automatic inventory reservation, the dedicated treasury signer and end-to-end funded acceptance remain outstanding. There is no public activation endpoint or hidden payable switch in this release.

## Tests
Native PHP tests use real SQLite transactions and uniqueness through a narrow wpdb shim to exercise duplicate claims, repeated verification, forced queue failure with rollback, reorg holds, invoice tampering, private-route access and the rollback-only schema probe. This does not simulate MySQL's row-lock scheduler. Production readiness reports actual InnoDB engine detection and the live rollback probe separately. Synthetic transactions are used; no funded transfer has been performed.
