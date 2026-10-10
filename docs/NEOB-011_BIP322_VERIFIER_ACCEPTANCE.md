# NEOB-011 — Bitcoin BIP-322 verifier acceptance gate

## Corrected protocol
BIP-322 simple/full signatures are base64-encoded serialized proofs, NOT application-prefixed `smp`, `ful`, or `pof` payloads. NEOB-010 mistakenly required such prefixes; NEOB-011 corrects the parsing guard.

Envelope validation alone cannot establish that any signature is authentic. A trusted Bitcoin script/BIP-322 verifier is **not connected** and the existing NEO Bank production entrypoint does not supply `verifyWalletSignature`, so the wallet verify route intentionally returns 503.

## Verification implementation specification
- Select audited BIP-322 implementation with support for P2PKH, P2WPKH, P2SH/P2WPKH and P2TR only where the underlying library has tested script rules; unsupported types must fail closed.
- Decode network-qualified Bitcoin addresses and witness/script proofs, enforce scriptPubKey matching and BIP-322 message digest rules.
- Test official BIP-322 vectors with positive and negative cases, wrong address, wrong network, malformed base64, expired challenge, replay, cross-tenant conflict and concurrent verification attempts.
- For any Counterparty asset, verify actual Bitcoin address/script ownership. Never treat Counterparty asset name as a signing format.
- Ensure Firestore challenge records contain the exact message signed and verify the immutable record inside the transaction. Expiry should use one source of time in validation and transaction.
- Do not expose a cryptographic 'verified' badge before successful signature checks and stored signed evidence.
- Future attestation: only digest or redacted metadata in Crown Chain L3; no customer PII, passwords, wallet seeds, session cookies or raw transcripts on a public ledger.
- Only after independent security and legal approval enable signing integrations. No transfer/convert/deposit features are activated by this gate.

## Deployment status
No production verifier, no CES read API, no live wallet routing, no on-chain Crown attestation. Existing review branch remains draft; tests pending CI validation.
