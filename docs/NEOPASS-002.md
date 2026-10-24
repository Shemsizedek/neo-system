# NEOPASS-002 — Wallet ownership proof boundary

Adds an isolated, tested wallet-link challenge service in server/neo-tokenworks/neopass-wallet-proof.mjs. It binds origin, Bitcoin network, address, authenticated subject and session to a five-minute random challenge. Verification consumes the challenge before awaiting the trusted signature adapter. A failed attempt requires a new challenge. No route or existing entitlement behavior is changed.

## Verified integration inventory

- GitHub repository: Shemsizedek/neo-system; base eeedf30deef7792ca23c9697be3b29fd897e9bb7.
- Render workspace tea-db8bbpij9qps73cb7gb0 is accessible. Existing platform API recovery and Counter staging services are present; no dedicated NEOpass service was found in the inventory. Service presence does not certify successful deployment or authentication.
- CounterPay connector exposes public-address balances, merchant checkout review and transaction status. It does not expose wallet ownership message signing or passkey enrollment. Do not substitute checkout approval for an ownership signature.

## Validation

All 13 Tokenworks tests pass, including six new ownership-proof tests covering replay/concurrency, session/account mismatch, expiry, adapter failure and input rejection. Signature fixtures are mock adapters, not proof of Bitcoin cryptographic compatibility.

An additional run of deploy/noogle-render/webauthn-assertion.test.mjs found its existing valid-assertion test fails (returns null). That file and its verifier are unchanged by this gate. Passkey readiness remains blocked pending diagnosis and signed-in device testing.

## Next implementation requirements

1. Connect a reviewed Bitcoin signature verifier and test real supported wallet/address formats, including wrong-address and wrong-network cases. CounterPay needs an explicit message-signing interface.
2. Replace this bounded in-memory sandbox store with atomic durable storage; bind issue/verify calls to trusted server authentication, never client-supplied identities.
3. Complete passkey enrollment, assertion verification, backup/revocation and recovery; resolve the existing assertion test failure.
4. Link verified wallet records to confirmed Counterparty balance policies with expiry and reorg handling, then Crown-authorized leases.
5. Build NEO Commerce/Tokenify consumers and separate equity/escrow workflows after authentication and custody verification.

No production activation, key ingestion, asset movement, escrow custody or marketplace execution occurs in this gate. The module does not implement Bitcoin signature cryptography or claim that passkeys directly sign Bitcoin transactions.
