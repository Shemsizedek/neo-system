# NEO Sovereign Secrets & Key Management Fabric

Gate 116 defines cryptographic custody for the Global Vast Estate.

The repository stores **metadata and policy only**. It must never contain plaintext production secrets, root private keys, CA private keys, wallet seeds, recovery shares, or hardware-unsealing material.

## Hierarchy

- Root keys: HSM/offline custody, non-exportable, threshold authorization.
- CA keys: HSM/secret-manager custody, non-exportable, threshold authorization.
- KEKs: hardware/secret-manager protected wrapping keys.
- DEKs: generated per object/session and stored only wrapped.
- Service secrets: short-lived runtime leases.
- Recovery material: offline split custody; only recovery-plan metadata is stored in NEO.

## Envelope encryption

Data is encrypted with a random DEK. The DEK is wrapped under a KEK. The plaintext DEK is zeroed after use in the software implementation.

Production hardware-backed wrapping should use a KMS/HSM adapter where the KEK itself never enters application memory.

## Threshold authorization

High-value key operations are approved only when the configured threshold is met by distinct eligible signers. This control is authorization metadata; it does not itself replace hardware enforcement. Production HSM policies should independently enforce equivalent or stronger controls.

## Secret leases

Services receive scoped, short-lived leases rather than durable credentials wherever possible. Lease validity does not expose the underlying secret value through public APIs.
