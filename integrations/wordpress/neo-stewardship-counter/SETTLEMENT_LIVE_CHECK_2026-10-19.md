# Settlement deployment check — 2026-10-19

Plugin 0.16.0 was uploaded to WordPress site 241770410 and reported active.

GET /wp-json/neo-counter/v1/settlement-status reported invoiceStorageReady=true and storageConstraintsChecked=true. The installation's InnoDB uniqueness/rollback probe passed. It is a rollback-only schema check, not a funded payment test.

Anonymous GET of a private invoice route returned HTTP 401. Anonymous POST of its verify route also returned HTTP 401. GET /wp-json/neo-counter/v1/rates?ledger=cp20&currency=btc returned HTTP 200 with daily conversion metadata and spreadBps=900.

Local native PHP tests passed for invoice creation/idempotency, exact payer/amount checks, confirmation/expiry/reorg handling, real SQLite uniqueness/rollback, injected queue failure, invoice integrity, access checks and the rollback-only probe. Existing daily pricing, checkout and wallet router tests passed. SQLite tests do not reproduce InnoDB row-lock scheduling; the deployed schema probe tests MySQL constraints and rollback separately.

No real member payment was submitted, no user-funded transaction was signed or broadcast, and no bonds were delivered. The live status explicitly reports tokenPaymentVerification=false, inventoryReservationsReady=false, automaticDelivery=false and paymentsEnabled=false. Treasury reservation/signing, Counterparty settlement verification and a funded acceptance test are still required before payment activation.
