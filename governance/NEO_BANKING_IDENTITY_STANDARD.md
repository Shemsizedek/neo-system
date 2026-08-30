# NEO Banking & Reserve Identity Standard

## Purpose

Bind the canonical NEO founder principal (`neo:founder:000001`) as reserved Account #1 across Nibiru Reserve, NEO Bank, NEO CES integration, and NEO Treasury without converting founder status into financial authority.

## Separation of authority

Founder ownership identifies the first reserved NEO principal. It does not itself authorize:

- reserve custody or reserve-asset movement;
- currency, credit, V-Dollar, token, or other issuance;
- treasury transfers or signing;
- transaction approval or settlement;
- CES administrator actions;
- impersonation of CES bank/admin accounts;
- bypass of authentication, MFA, step-up, dual-control, or transaction policy.

Financial actions must be separately authenticated, authorized, policy-checked, and audited.

## External CES identities

CES identifiers such as administrator or bank account names remain native external identifiers. NEO may map a verified external identifier to the canonical founder subject, but it must not claim that Account #1 changes the CES provider's native numbering, ownership rules, or authorization model.

Mappings store identifiers only. Passwords, session cookies, MFA secrets, recovery material, signing keys, private keys, and other credentials are prohibited from the identity registry.

## Bots and automation

NEO Bank Bots operate as delegated automation, not as founder impersonation. Existing human-approval and value-movement controls remain authoritative. A bot may execute only a scope explicitly granted by the financial policy layer and the external system.

## Treasury and custody

Public wallet addresses may be referenced by product-specific registries when operationally required. Private keys, seed phrases, signing secrets, recovery codes, and custody credentials must never be stored in the public founder/product identity registry.

## Audit invariant

Every privileged financial operation must retain enough audit context to identify the acting principal, delegated agent if any, authorization basis, approval state, target external account, and result.
