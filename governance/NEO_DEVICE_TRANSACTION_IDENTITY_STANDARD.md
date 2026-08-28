# NEO Device & Transaction Identity Standard

Status: Proposed Core Standard  
Version: 1.0.0

## Canonical operator

NEO Counter, NEO Teller, and the shared NEO device registry reserve their first human operator account for `neo:founder:000001` as Account #1 with role `founder_owner`.

## Device enrollment

Account ownership never auto-enrolls hardware. A device must be explicitly paired, verified, and attested before it can be associated with any operator. Device records may contain public identifiers, public keys/fingerprints, capabilities, status, and audit metadata. They must not contain private device keys, PINs, card data, wallet signing keys, seed phrases, or recovery secrets.

## Transaction boundary

Founder status is not transaction authorization. NEO Counter and NEO Teller must continue to require the normal authenticated session, device state, transaction policy, and any required step-up approval before money movement. Account #1 does not bypass terminal authentication, transaction approval, cash dispense controls, settlement policy, or device attestation.

## NEO Teller bootstrap

NEO Teller may consume this identity contract before its dedicated application surface exists. The reserved product ID is `neo-teller`; future Teller services must bind to this principal rather than creating a new founder identity.

## NEO Counter hardware model

The current NEO Counter browser hardware layer remains capability-oriented and safe by default. NFC/EMV terminal adapters expose capability metadata and must not read or persist raw card credentials. Verified device enrollment is an additional ownership/attestation layer and does not convert a simulator or browser adapter into certified payment hardware.

## Audit invariants

- Account #1 is reserved and non-recyclable under the NEO founder standard.
- Every device enrollment records the operator subject and enrollment timestamp.
- High-impact device or transaction actions require authenticated authorization and auditable events.
- Private credentials and signing secrets remain outside the public identity registry.
