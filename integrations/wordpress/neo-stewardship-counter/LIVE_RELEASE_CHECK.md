# Stewardship live-release check — 2026-10-17
Decision: HOLD. User authorized testing and production activation; no further permission is required for that scope.

## Tests completed
- Quote controller: pass (itemization, instrument switch, edit invalidation, expiry, missing/stale input, invalid quantity and Form 144 submission gate).
- Integer pricing: pass (gross-up, rounding, expiry, input validation and 100 fee-coverage scenarios).
- Deployed anonymous POST to admin-post.php?action=neo_stewardship_prepare: HTTP 400, rejected without authentication.
- Prior public route checks verified separate Classic and 2.0 market snapshots and preserved Indenture placement.

## Missing implementation and access
Source review of payment.php confirms that it writes PREPARED_NOT_PAYABLE checkout records only. It does not implement unique payable invoice allocation, authoritative BTC confirmation/reorg handling, payment replay protection, per-ledger inventory reservation, signed Counterparty token transfers or confirmed delivery.
No connected Freewallet signer tool was available. Public source address 1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8 is configured but does not grant signing access.

## Not tested
Actual signed-in Form 144 upload and private administrator download; signed-in checkout creation; native camera operation; a funded payment; wallet signing; transfer broadcast; confirmed member token holding on either ledger.

## Release condition
Implement and connect payment verification and a wallet-controlled signing bridge, then run a controlled end-to-end transaction on each ledger before exposing a payable QR. The signing bridge must keep private keys in the wallet, permit explicit user authorization and allow independent inspection of source, destination, asset, quantity and fees. A node's compose API is not signing authority.

No payment request or real transfer was enabled or performed by this check.
