# Confirmed Crown issuance receipts

This folder contains **machine-generated, immutable-by-default readback receipts** after the signer supplies a real transaction hash in an approved intent and independent Counterparty Core checks succeed. Receipts are off-chain evidence records, not wallet signatures or certificates of ownership. Never replace a receipt with conflicting transaction hashes, block hashes or metadata content without investigation of a possible reorganization or compromised issuer.

Receipts are created by `node scripts/crown-issuance-reconcile.mjs --confirm-all` only when the exact canonical URL returns valid JSON and the official Counterparty Core mainnet readback meets the confirmation threshold. TokenScan visibility is a **separate** external check and remains unverified in receipt files. 
