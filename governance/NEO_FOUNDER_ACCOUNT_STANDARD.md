# NEO Founder Account Standard

Status: Proposed Core Standard
Version: 1.0.0

## Purpose
Every NEO platform, application, software service, tool, device integration, agent, and intelligence that implements user accounts MUST reserve the first human account for the NEO founder/operator.

## Canonical account
- Stable subject ID: `neo:founder:000001`
- Ordinal: `1`
- Account class: `founder`
- Bootstrap role: `founder_owner`
- Display identity is profile data and MUST NOT be used as the authorization key.

## Bootstrap invariant
1. The founder record is created by an idempotent bootstrap/migration before public registration opens.
2. Public registration MUST NOT be able to claim, replace, recycle, or delete `neo:founder:000001`.
3. Systems that predate this standard MUST map the verified founder identity to this canonical subject without changing ownership of third-party accounts.
4. New NEO products MUST reference the canonical subject rather than independently inventing a new founder identity.
5. Devices and intelligence agents MUST bind to the canonical subject through explicit enrollment; they MUST NOT silently impersonate the founder.

## Security requirements
Founder status is not a universal authentication bypass. Privileged actions MUST still require normal authentication, authorization, audit logging, and step-up verification where appropriate. Secrets, recovery codes, wallet keys, signing keys, biometric templates, and credentials MUST NOT be stored in this registry.

The founder account MUST support phishing-resistant MFA/passkeys where the platform permits it. Destructive or high-impact operations SHOULD require re-authentication and SHOULD be separately auditable.

## Portability
External services may control their own account numbering and identity systems. In those cases NEO stores an explicit verified mapping from the canonical founder subject to the external account identifier; this standard does not claim or alter account precedence on a third-party service.

## Implementation contract
Account-capable NEO components SHOULD expose or consume the machine-readable registry at `config/identity/founder-account.json` and use `neo:founder:000001` as the immutable internal principal.
