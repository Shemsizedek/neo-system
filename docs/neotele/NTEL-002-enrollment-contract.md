# NTEL-002 — Integration Gate

## Implemented
- Injectable server-side NEOpass, Chaplaincy membership, and NEO Guardian device-verification boundaries.
- Reject unverified sessions, inactive/non-Chaplaincy membership and devices not owned by the authenticated subject.
- Require eSIM-capable, carrier-unlocked device; physical carrier support still requires a real provider check.
- Save requests through an injected persistence adapter with an explicit atomic idempotency contract.
- Redacted member-specific dashboard projection: state, device reference, carrier connection indicator; **no activation codes, QR contents or profile credentials**.
- Test cases for authorization, ownership, and eligible devices.

## Still required for runtime operation
- Bind injected adapters to actual production NEOpass, CRM and Guardian services using trusted server-side sessions.
- Implement transactional persistent storage for idempotency and auditable state changes.
- Enforce access-control and rate limits in HTTP route handlers; protect service queries from IDOR.
- Verify provider/SM-DP+ availability, operator contracts, number assignment, E911 and disclosures.
- Add front-end dashboard routes and end-to-end staging tests.
- Resolve what happens if audit persistence fails after saving; production integration must use durable transactional outbox.
- Do not expose any eSIM activation action until carrier integration has been certified.

## Suggested local verification
`node --test server/neotele/*.test.mjs`

## Release
This is a development contract and test layer. No carrier provisioning API, real eSIM, or deployed member dashboard is included.
