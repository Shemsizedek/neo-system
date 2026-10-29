# NOMNI Project 144 - Independent Bitcoin block and CES account attestation gate
Date: 2026-10-29. STATUS: PARTIALLY VERIFIED / USD CASH RESERVES UNVERIFIED.

## Bitcoin block linkage: cross-source verified
At height 973747, Counterparty Core returned block hash 00000000000000000000e5ec8afda9ea0fafaa223be5d259dd73bd933407a9fe; Blockstream and mempool.space independently returned exactly that same Bitcoin block hash.
Official Counterparty ledger_hash at that height: ee720769a1992c56e51a620222d327f1f39541e67dfefce8d9740dd18d4ab1a4.
Bitcoin block consistency does NOT prove a second independently operated Counterparty node or identical Counterparty ledger calculations.
Sources:
- https://api.counterparty.io:4000/v2/blocks/973747
- https://blockstream.info/api/block-height/973747
- https://mempool.space/api/block-height/973747

CoinDaddy public v2 test at HTTPS port 4001 was unsuccessful (connection/tunnel failure). Do NOT mark second-node verification complete.

## Protocol verification still required
Obtain a separately operated and independently authenticated Counterparty Core v11.5+ mainnet node. On both nodes, gather root, same-height block record, NOMNI metadata, full issuances, full holdings including escrow, and destruction records. Require server_ready, Following, mainnet, aligned Bitcoin and Counterparty heights, exhausted pagination, and exact 900M issuance/holdings. Compare block_hash, ledger_hash, messages_hash, txlist_hash, issuer, asset ID, owner, supply, and holder/escrow totals with dual-node-proof.mjs. The validator expressly cannot certify operator independence; audit signing and infrastructure provenance require separate human verification. No exposed node credentials or keys.

## Archived 2021 NEO Index Prospectus clarifies CES V-Dollar
Authorized confidential 2021 prospectus, printed pages 39-42, describes Virtual-/Voucher-Dollar as a CES participant account used alongside NOMNI, with balances acquired through peer sales OR through cleared deposits in USD, BTC and XCP. It says deposit verification is manual, and describes an offered/planned electronic-transfer US-dollar redemption mechanism.
These are historical issuer claims about designed account operations. They are NOT proof of cash custody, actual fulfilled redemptions, a present legal dollar obligation on all NOMNI, approved US charter, or exact executed numeric 1:1 NOMNI-V-Dollar conversion terms. V-Dollars earned through trade are not necessarily accompanied by a new USD deposit. The historical founding unit-parity model is preserved without treating CES credit as verified dollar reserve.
Private archive source files and account holder identifiers were not copied into GitHub.

## Offline CES reconciliation controls
The newly added ces-account-reconciliation.mjs validates only arithmetic in a sanitized single-account summary:
opening + tradeCredits + clearedDepositCredits - tradeDebits - usdRedemptionDebits = closing.
Amounts are exact decimal strings, with a non-sensitive evidence reference. Passing this check never verifies live CES account data, reserve custodian balances, bank account ownership, issuer licensing, cash redemption or CES-wide liability totals.

## Next evidence gates
1. Independently operated second synchronized Counterparty Core node: full same-block hashes and NOMNI supply/escrow comparison.
2. Original signed/executed CES 1:1 pricing and redemption terms identifying NOMNI, VDOLLAR, USD and participant obligations.
3. Privately authenticated current CES NMNI / V-Dollar statements and network-wide issued liabilities.
4. Independently verified legally eligible segregated USD reserve assets, actual bank/custodian reporting, and issuer/legal rights review.

No payments, NOMNI/V-Dollar issuance, ETH/Base, Coinbase permission expansion, production changes or public dollar-redemption claims authorized.
