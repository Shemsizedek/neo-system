# Production check — 0.17.0

Deployed to holytemples.org on 2026-10-19; plugin management reports active version 0.17.0.

Live /wp-json/neo-counter/v1/settlement-status reports invoiceStorageReady=true, storageConstraintsChecked=true (the v2 rollback-only probe checks stock/reservation storage as well), ledger-specific token verification enabled, and confirmed-payment inventory reservations ready. Public POST to /invoices/2010/verify returns 401. Rates remain available with markupBps=900.

PaymentsEnabled=false and automaticDelivery=false. No member payment, signature, transaction broadcast or token transfer was made. Public API reads verified the distinct Classic and CP2 endpoints, matching canonical block 972180, and PLEDGEBOND source inventory. These are API compatibility checks, not a funded checkout acceptance test. Treasury signing, pre-payment reservation lifecycle, delivery worker and broadcast/reconciliation remain outstanding.
