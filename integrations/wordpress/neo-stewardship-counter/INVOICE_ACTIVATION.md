# Invoice activation workflow — 0.23.0 candidate

Implementation only; not installed or enabled in production. No signing keys are read, imported or used. No wallet-control proof has been obtained from Counterpay.

Physical-product orders and service bills now have three serialized transitions:

1. The invoice customer reviews the exact amount, currency, recipient and terms, explicitly checks consent, and posts the current payload hash through a nonce-protected WordPress form. Only the invoice owner may accept; an administrator cannot accept for the customer. The invoice remains nonpayable in AWAITING_ACTIVATION.
2. An administrator activates that accepted invoice using its current payload hash. The server must have a trusted wallet-proof integration. Its evidence must bind the exact accepted payload, recipient, mainnet and ledger, with strict verification booleans, an opaque proof digest, an observation no older than 60 seconds and validity covering the invoice expiry. Successful activation records the operator and evidence digest and moves to AWAITING_PAYMENT. No payment or delivery is submitted.
3. An administrator can cancel an unpaid invoice. Closed, expired or payment-observed invoices and invoices with claims/delivery jobs cannot be changed through this workflow. Reconciliation is required instead.

All transitions lock the same invoice row as settlement, validate stored payload integrity, and commit the new payload/hash/state atomically. Stale hashes and duplicate transitions are rejected. The SQLite tests exercise real rollback and uniqueness; production InnoDB concurrent scheduling is not simulated.

The checkout and authenticated invoice route now derive payment visibility from activated, accepted, unexpired invoice state and the trusted adapter binding. An unbound adapter keeps QR/copy disabled. This code does not install a verifier or treat a wallet connection, public transaction history, address balance, browser flag or user-provided evidence as wallet control.

## Counterpay integration still required

The inspected Counterpay/NeoMask bridge supports connect, getAccount, signPsbt and disconnect. It does not expose message signing. Do not construct a payment or ask for an arbitrary PSBT signature as a substitute for ownership proof.

The PHP filter `neo_counter_activation_evidence` is a trusted server integration contract, defaulting to null. Only reviewed integration code should register it. It receives the locked authoritative invoice row; it must independently validate a fresh, purpose/origin/recipient-bound wallet-control challenge and current mainnet/ledger evidence. It returns:

- wallet_control_verified:true and chain_verified:true only after successful verification;
- network:mainnet, exact invoice ledger and destination;
- payload_hash equal to the accepted invoice hash;
- observed_at and expires_at as integer Unix seconds;
- proof_id as a 64-character lowercase SHA-256 digest referencing protected evidence.

The activation guard validates the envelope and bindings; it is not itself a cryptographic signature verifier. Never bind this filter to a constant true, a browser request, a mocked test response or a mere wallet connection. Tests intentionally inject fixtures only in the test process. Production remains blocked until the genuine Counterpay challenge/signature verification path exists and is tested.

The settlement status adds activationWorkflowReady and walletProofAdapterBound. paymentsEnabled reports capability availability when a server adapter is bound and transactional storage is ready; it does not make every invoice payable or prove any individual merchant. Per-invoice activation checks remain mandatory. Automatic delivery remains false.

## Limits and validation

Bond/token sales and digital delivery retain their separate setup holds. No guest checkout, key import, trading, Expert Advisor authority, custody, broadcasting or automatic fulfillment is introduced. Trading desk authorization is a separate workstream and is not granted by invoice activation.

Validation covers owner/operator separation, anonymous denial, consent-form binding, missing adapter, incorrect/future/stale/expired proof, wrong recipient/ledger/network/hash, expiry, terms integrity, replay, cancellation, existing payment observations/claims and injected write rollback. Run all plugin PHP suites and JavaScript tests before release. The seven PHP test scripts and 25 JavaScript tests passed locally; production UI and real Counterpay signing remain untested.

Rollout requires maintainer review, a real proof adapter, synthetic staging acceptance/activation/cancellation and concurrent activation-versus-verification checks before any production upgrade. Keep the current plugin package for rollback. This candidate introduces no schema migration; reverting after using transitions requires reconciliation of activated invoices rather than silently discarding acceptance/activation evidence.
