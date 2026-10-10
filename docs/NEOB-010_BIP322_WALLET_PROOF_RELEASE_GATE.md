# NEOB-010 — BIP-322 Verification Hardening and Wallet Claim Uniqueness

This gate extends the existing NEO Bank PR. It does **not** implement a production cryptographic engine.

## Implemented
- Restrict proof envelopes to explicitly named BIP-322 `smp`, `ful`, or `pof` variants. Prefix checks alone do not authenticate anything.
- Preserve fail-closed behavior if no trusted signature verifier exists.
- Introduce transactionally enforced wallet uniqueness keyed by SHA-256(network + ":" + address), preventing distinct subjects from claiming the same network/address through concurrent proof submissions.
- Keep proof records tied to authenticated subjects, verified NMNI accounts, one-time challenges, and expiry checks.
- Expose deterministic 400 responses for unsupported proof envelopes and 409 for address conflicts.

## Mandatory blockers before activation
1. Choose and audit a library or verifier service implementing current BIP-322 **version 2.0.0** verification, including script execution for supported Bitcoin address types and canonical test vectors.
2. Verify network-qualified addresses via decoded scriptPubKey, not string length/prefix heuristics; Counterparty assets rely on appropriate Bitcoin address checks.
3. Explicitly support the wallet signing modes available in NEO Pass; no server-side seed phrases, no remote mnemonic collection.
4. Validate the transactionally consumed challenge's stored message and address, and independently enforce expiry inside the transaction. Recheck account ownership and wallet uniqueness atomically.
5. Decide shared custody / delegation policy: a shared address should not automatically claim multiple account holders; record exceptions only via separate audited institutional permissions.
6. Add a private Crown Chain attestation writer after successful verification, with personal details off-chain, integrity digest, explicit retention policy and access control. Do not label a private Firestore record as blockchain-anchored.
7. Run `npm run neo-bank:test`, CI, integration tests for expired/replayed/conflicting claims, and security review before enabling production verification.

## CES synchronization
The CES adapter remains `NOT_AUTHORIZED` and read-only. No browser-login bot, automated account trading, or invented CES balance verification is enabled.

## Status
Development branch code prepared for review. No deployment, on-chain attestation or wallet transfer authorization.
