# NEO Kether Tamerean Capability-Confinement Kernel v1.2

## Core theorem

```
AUTHORIZED IDENTITY != AUTHORIZED CAPABILITY
```

A grant binds:

```
WHO + WHAT + TARGET + PARAMETER SCOPE + TIME + RATE + REVOCATION
```

## Constitutional laws

- Identity does not imply unrestricted authority.
- Capability grants are explicit and bounded.
- Target scope is allow-listed.
- Parameter scope must match the authorized hash.
- Grants expire.
- Grants can be revoked.
- Usage is quantity/rate constrained.
- Action IDs are single-use.
- Revoked, expired, replayed, over-limit, or out-of-scope actions fail closed.

## Epistemic and operational boundary

A valid capability use proves the action matched the encoded grant constraints. It does not prove the action was successful, beneficial, or causally responsible for an external outcome.

This module remains within the repository's FOUNDATION / SANDBOX boundary.
