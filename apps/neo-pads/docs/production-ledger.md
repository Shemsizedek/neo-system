# NEO Pads production ledger

This gate replaces single-process JSON persistence as the production target with PostgreSQL transactional state.

## Ledger separation

NEO Pads keeps five independently auditable concerns:

1. Property/listing authority.
2. Booking and occupancy entitlement.
3. NEO Counter payment state.
4. Host payout state.
5. Immutable audit events.

Counterparty HOMESHARES ownership is queried from the Bitcoin/Counterparty rail and is not copied into the database as a substitute asset ledger.

## Availability invariant

`neo_pads_bookings` uses a PostgreSQL GiST exclusion constraint over `(property_id, stay_window)` for booking states that consume inventory. This makes double-booking prevention a database invariant rather than an application-side race-prone check.

The stay range is half-open `[start,end)`, so a checkout and a new check-in may occur at the same instant without overlapping.

## Payment event invariant

`neo_pads_payment_events.event_id` is unique. An authenticated NEO Counter webhook must insert its event record before applying a state transition. Duplicate delivery therefore becomes a no-op.

Store a SHA-256 digest of the authenticated payload in `payload_sha256`; do not store secrets, private keys, or bearer credentials in the audit ledger.

## Host payout invariant

Each booking may have at most one canonical payout record. Retries update the payout's operational state; they do not create a second economic obligation. The final network transaction identifier belongs in `txid`.

## Audit invariant

`neo_pads_audit_log` is append-only at the application layer. Every material state transition should write an audit event in the same database transaction as the state change.

## Transaction pattern for reservation creation

1. Begin transaction.
2. Verify the property is ACTIVE.
3. Re-confirm host policy where required by risk rules.
4. Insert booking in an inventory-consuming state.
5. PostgreSQL evaluates the exclusion constraint; an overlap fails atomically.
6. Insert audit event.
7. Commit.
8. Create/associate the NEO Counter checkout.

If checkout creation fails, move the booking to an appropriate non-consuming/expired state under a new transaction and record the transition.

## Production cutover

The existing `RuntimeStore` JSON mode remains useful for local development and one-instance demos. Production should set a PostgreSQL `DATABASE_URL` and use a database-backed repository implementation before multi-instance deployment.
