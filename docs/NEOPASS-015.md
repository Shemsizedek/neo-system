# NEOPASS-015 — First owner account and layered community access

## Accepted account model

The operator's existing verified Google-linked Noogle NEOpass identity must occupy account number 1. Preserve the authoritative canonical account subject; do not create a new pseudonymous account for this migration. Google is the base entry method. NeoMask supplies wallet ownership/security steps. NEOpass passkeys or security keys supply additional user-verified steps for protected services. A Noogle session may authorize opening the NeoMask local unlock ceremony; it never contains the wallet key or remotely decrypts the vault.

## Implemented policy

| Service policy | Required verified methods |
| --- | --- |
| Basic membership | Google |
| Wallet-protected entry | Google + wallet proof |
| Higher-security entry | Google + passkey user verification |
| Protected community entry | Google + wallet proof + passkey user verification |
| NeoMask unlock entry | Google + passkey, followed by local wallet approval |

All proofs must resolve server-side to the same canonical subject and target-service audience. Google proof freshness is limited to one hour; wallet/passkey steps to five minutes. Future, stale, mismatched or unverified proofs fail closed. Each service still checks its own membership permissions. Proofs do not confer Temple offices, administrator privileges or transaction approval. Google tokens must be validated by the trusted upstream and translated into scoped assurance records; the access evaluator does not accept raw browser claims.

The internal first-account provisioner requires an operator-pinned issuer and provider subject plus a trusted owner-identity resolver. It records slot 1 against the existing authoritative canonical subject in a transactional persistent registry. It is idempotent across restart and refuses reassignment. Email strings, being the first public visitor or an arbitrary account claim are insufficient. No public provisioning endpoint exists.

## Face, fingerprint and security-key behavior

WebAuthn verifies authenticator signatures and user-verification results. Device-supported facial recognition or fingerprint can satisfy local verification; the website does not receive biometric templates or reliably select a particular biometric method. Requiring a verified hardware/security-key class needs a separately configured attestation policy. A synced passkey is not automatically device-bound or a hardware-attested key.

## Status and validation

163 targeted platform/NeoMask/Noogle Connect tests pass, including base-vs-step-up decisions, combined proofs, subject/audience/freshness/UV rejection, independent membership checks and persistent pinned first-account reservation. The last owner-subject preservation change passed its targeted registry test.

These are draft internal policy/provisioning modules. No production first-account row was created and no credential was enrolled. The live CounterPay evidence verifies ChatGPT owner access and wallet association; it does not establish the operator's stable Google provider subject. Obtain that subject and the existing canonical account from the authoritative verified login service, then use the provisioner through an approved migration. Never invent an ID from an email or assume identities match across Sites.

Remaining: live owner identity migration, attaching passkeys to the preserved canonical account instead of new registration, Google-to-Noogle session integration, NeoMask trusted local unlock UI and service-specific enforcement. The standalone passkey registration UI remains disabled by default and must not be used to create a competing owner identity. External sites must integrate NEOpass; password-protected sites do not accept it automatically.
