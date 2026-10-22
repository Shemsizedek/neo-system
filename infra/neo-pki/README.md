# NEO Sovereign Identity / Certificate Authority Fabric

Gate 115 provides the Estate PKI control plane.

The repository contains **no CA private key**. Root/intermediate private material must remain in an approved HSM or deployment secret manager. Node/service private keys remain on the subject node or in an approved hardware-backed keystore.

## Credential layers

1. Gate 112 node attestation establishes a verified node candidate.
2. Gate 115 issues a short-lived signed NEO identity credential.
3. The X.509 adapter contract converts an approved identity request into a standards-compliant TLS certificate through an approved CA/HSM implementation.
4. Gate 114 service discovery may then require mutual authentication between those identities.

The built-in NEO identity credential is a signed authorization/provenance envelope. It is **not represented as an X.509 certificate**. Production mTLS requires the X.509 issuance adapter or another standards-compliant certificate implementation.

## Rotation and revocation

Certificates/credentials should be short-lived. Rotation begins before expiry according to policy. Revocation is fail-closed for private service-to-service admission.

## Hardware binding

When TPM, Secure Enclave, Android hardware-backed Keystore, or equivalent attestation is available, the hardware-binding evidence can be referenced in the certificate request. Caller-supplied strings alone are not sufficient proof.
