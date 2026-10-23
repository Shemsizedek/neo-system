# NES-011 — NEO Pass and Customer Relations Authorization Contract

Status: access-control specification; no live customer data or NEO Pass integration.

## Identity and authorization
- NEO Pass token verification must be performed server-side, including issuer, audience, expiry, signature, and revocation policy.
- Never use a CES member reference or public wallet address as proof of ownership of a utility meter.
- Site-to-account relationship is a documented and revocable grant, backed by verified utility onboarding.
- Default-deny all operations, require tenant/site scope and separate field-operator roles.
- Customer may view only authorized household statements and correctable account profile details.
- Support representatives access consented cases, not full other-customer account records.
- Field controller commands remain disabled and cannot be granted by this portal role model.
- Support meter reading disputes, audit log, retention, and data export/deletion requests where required.

## Roles
CUSTOMER_READ: scoped personal readings and simulation statements.
UTILITY_SUPPORT: scoped case handling under assigned grants.
METER_AUDITOR: read-only evidentiary verification.
ENGINEER_REVIEWER: read-only engineering design and approval records.
FIELD_OPERATOR: **not provisioned by NES-011**; separately qualified physical operations only.

## Next implementation
Integrate NEO Pass issuer discovery and verified JWK keys, storage and revocation of scoped grants, server-side authorization middleware, tenant isolation tests and breach notification workflow. Do not expose connected real meters until independently reviewed.
