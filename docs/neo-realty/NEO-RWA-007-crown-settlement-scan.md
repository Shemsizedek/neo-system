# NEO-RWA-007 — Crown Chain Financial Settlement and NEO Scan Title Verification

## Governing model
NEO Crown Chain is a Bitcoin-anchored **financial transaction evidence layer**. NEO Scan is the cross-market financial explorer (real estate, securities, stocks, funds, credit, payments, insurance and other financial genres). **NEO Title is a verified record type exposed within NEO Scan**, not a separate public explorer or a listing for unverified submissions.

## Transaction chain
1. Property purchase terms authorize a NOMNI-denominated settlement through an approved Counterparty/Bitcoin multisignature escrow arrangement.
2. Escrow evidence captures wallet IDs (public addresses only), funding and payout transactions, confirmations, signer threshold, release authorizations, amounts and Counterparty asset metadata.
3. Independent closing attorney confirms payment receipt/acceptance and signed conveyance; county recording yields deed instrument reference and official record status.
4. Restrict deed artifacts and private identities in an access-controlled vault, hash canonical evidence manifests (SHA-256), and link `payment_btc_txid`, `counterparty_asset_event`, `deed_document_sha256`, `recorded_deed_instrument`, `closing_attestation_id` into a signed settlement record.
5. NEO Crown Chain anchors the **settlement-event hash** and relevant bitcoin txid/confirmation evidence in its chain. Record chain anchor location and verification status. Deed content itself is not presumed to be directly embedded on Bitcoin.
6. NEO Scan publishes only **VERIFIED_TITLE_SETTLEMENT** after independent county recording verification, deed-to-parcel match, confirmation threshold, amount reconciliation, signer approvals and Crown Chain anchor confirmation. All unverified title applications stay restricted to internal case management.

## State and safety
`DRAFT -> ESCROW_CONFIGURED -> ESCROW_FUNDED -> PAYMENT_RELEASED -> DEED_RECORDED -> CLOSING_VERIFIED -> CROWN_ANCHORED -> SCAN_PUBLISHED`.
No skipping; rejection/reorg/revocation events must be preserved. An irreversible blockchain transfer alone does not transfer NC real property title, and a deed record alone does not prove a NOMNI purchase was funded. Title legal effect depends on state property law; a multisig Bitcoin wallet is technical custody, not necessarily lawful closing escrow or a regulated trustee.

## Required fields
`case_id, parcel_id, financial_asset_class, instrument_type, payment_btc_txid, payment_asset, payment_units, usd_agreed_reference, wallet_multisig_descriptor_hash, escrow_signer_policy, payment_confirmations, deed_document_sha256, deed_book, deed_page, recording_date, record_office, closing_attestation_id, crown_event_hash, crown_anchor_txid, crown_anchor_confirmations, verification_status, verified_at, verified_by, public_scan_visibility`.

## Acceptance and test cases
- Incomplete or unsigned deed: must not appear as verified NEO Title in NEO Scan.
- No county recording confirmation: do not publish.
- No payment txid, zero confirmations, Counterparty mismatch or wallet funding/escrow release inconsistency: do not publish.
- Bitcoin reorganization: flag and remove VERIFIED presentation until re-verified.
- Mismatch between deed hash, parcel, payment and closing record: block publication.
- Same deed and txid across conflicting parcels: flag for review.
- Confirm public NEO Scan financial genre discoverability using `REAL_ESTATE_TITLE` category without disclosing private deed contents.
- Verify separate attestation stages: Bitcoin confirmed; Counterparty event decoded; escrow reconciled; deed recorded; attorney-verified; Crown Chain anchored.
- All real-world events require authoritative external evidence, not simulated state. No live custody, financial transfers, token mint or publishing to NEO Scan until approvals.

## Implementation notes
Counterparty issuance and BTC settlement may create multiple on-chain identifiers. Preserve explicit links to each rather than implying all reside within one base-layer Bitcoin transaction. Signer quorum must be enforced by actual multisignature spending policy, not merely recorded in app database.
