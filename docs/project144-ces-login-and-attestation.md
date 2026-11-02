# Project 144 - CES repeatable login and account attestation

## Login continuity
The CES read runtime uses protected server-side configuration and creates a new authenticated CES session when requested. An open desktop browser is not required for later server operations. Browser cookies are not a durable service credential.

Store the CES NMNI account username and password only as protected runtime environment values named `NEO_CES_NMNI_USERNAME` and `NEO_CES_NMNI_PASSWORD`. The account also requires any CES-issued MFA or challenge, if present, during login. Provision the existing `NEO_CES_BACKEND_TOKEN` and `NEO_CES_RUNTIME_TOKEN` through the Render secret configuration; tokens must be separate and restricted by operation. Confirm configuration with authorized `/v1/status`, not a public endpoint. Do not print values, submit credentials in chat, copy browser cookies, or commit secrets.

Source access is read-only unless a separate approved, tested import policy is activated. Rotate credentials on account changes or incidents. Authenticate again when cookies expire rather than persist server-side cookies indefinitely.

## Attestation policy
`server/neo-bots/ces-account-attestor.mjs` is the CES-side Ed25519 signer. Its private key should be a dedicated `NEO_CES_ATTESTOR_PRIVATE_KEY_PEM` runtime secret; its public key is pinned in NEO Bank. Neither is currently provisioned by this source change.

The separate `accountControlVerifier` must independently check an authorized CES protected account record for the precise exchange account AND authorized delegation to the NEO identity. Successful generic admin login does not establish account control. As of this gate, no reviewed CES source account record and principal delegation verifier has been established; signing is therefore disabled.

The protected `POST /v1/account/attest` endpoint accepts a short-lived NEO Bank challenge, only with dedicated backend authorization and only after the account-control verifier is configured. It rejects browser origins, operator-only authorization, unverified accounts, and malformed requests. Do not share the CES attestor private key with the bank application. NEO Bank pins the public key and independently consumes each nonce using its persistent challenge store.

## Evidence and launch sequence
1. Obtain reviewed CES account-control records for `NMNIBANK`, then `XCPCBANK`; verify each NEO principal delegation through a trusted upstream mechanism.
2. Configure a least-privilege server-side account-control verifier and audit its exact source, selectors, and proof conditions.
3. Generate a dedicated Ed25519 keypair in a protected environment and provision the signing secret only to CES runtime. Pin the corresponding public key in the bank backend using secure configuration.
4. Validate bank challenges, actual source-specific proof, signature and replay rejection. Keep issuance, settlement and all financial writes disabled.
5. Review Neon schema migrations and apply only after approval and staging backup. Confirm each account link is identifier-only.
6. Verify browserless repeat login, backend status, and recovery after restart without exposing credentials or session state.

**No production DNS, CES account, balance, payment or bank database changes are authorized by this document.**
