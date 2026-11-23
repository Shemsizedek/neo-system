# NEOPASS-017 — shared protected-page gate

Requested sequence: NEO Pass identity and user-verified passkey → NeoMask local vault unlock and wallet ownership proof → CounterPay. Other member pages use the same gate with their service membership authorization; wallet-protected pages opt into the NeoMask requirement.

Implemented an isolated server-side gate factory, with no startup or production wiring. Trusted resolvers must validate issuer, sessions, expiry, revocation and authoritative proof records on every request. All proofs must share the canonical account and intended service. Passkey proof must follow identity verification; NeoMask proof must follow passkey verification. A connected address alone is insufficient. Decisions never release keys or approve transactions.

Google and future social providers establish identity through NEO Pass only after their integrations are verified. They do not encrypt passkeys or decrypt a seed vault. Platform authenticators hold passkey private keys; NeoMask must retain local encrypted seed custody and explicit unlock. No seed, private key or biometric is sent to this gate.

Validation: seven targeted shared gate/access-level tests pass, including order, missing steps, subject/audience mismatch, freshness, UV, local unlock, membership denial and request-by-request revocation lookup.

Release state: committed for review only. CounterPay, GISD and Temple routes have not been wired to this adapter. Production NEO Pass remains blocked on reconnecting the authenticated runtime and verifying its Google, signing and authoritative account-store configuration. NeoMask still needs a production session/proof adapter and local unlock bridge. No new provider or wallet security capability is claimed live. Existing CounterPay access is unchanged pending a working end-to-end migration.
