# NEO Kether Tamerean Capability-Confinement Kernel v1.2

## Core theorem

AUTHORIZED IDENTITY != AUTHORIZED CAPABILITY

## Grant dimensions

WHO + WHAT + TARGET + PARAMETER SCOPE + TIME + RATE + REVOCATION

A capability grant binds subject identity, exact capability, enumerated targets, parameter-scope hash,
activation time, expiry time, maximum uses, policy hash, and revocation root.

## Constitutional laws

- Identity does not imply unrestricted authority.
- Capability grants are explicit and bounded.
- Target scope is allow-listed.
- Parameter scope must match the authorized hash.
- Grants expire.
- Grants can be revoked.
- Usage is quantity constrained.
- Action IDs are single-use.
- Revoked, expired, replayed, over-limit, or out-of-scope actions fail closed.

## Boundary

A valid capability use proves the action matched the encoded grant constraints. It does not prove the action
was successful, beneficial, or causally responsible for an external outcome.
