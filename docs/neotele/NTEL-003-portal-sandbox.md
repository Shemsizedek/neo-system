# NTEL-003 — Chaplaincy Member Portal and Carrier Sandbox
The server-side portal composition endpoint checks verified NEOpass session, active Chaplaincy membership, and subject-scoped device/service records. It returns a redacted member view, compatibility reasons and explicit carrier-unavailable status. This is **not yet mounted on an HTTP API or a public frontend**.
The carrier sandbox never issues eSIM profiles or activation codes. No production provider secrets or cellular access are used.

## Durable storage gate
Enrollment persistence must use a unique `(member_id,idempotency_key)` index, RLS/tenant controls, request event log, and transactional outbox for audit publication. A real database adapter and schema migration are still required, and are not asserted as implemented here.

## Test
`node --test server/neotele/*.test.mjs`

## NTEL-004
Build authenticated HTTP handlers, member-facing UI, durable storage migrations, eSIM provider compatibility integration, security review and end-to-end tests before any staging promotion.
