import crypto from "node:crypto";
import { Pool, PoolClient } from "pg";
import type { BookingRecord, PropertyRecord, ReconciliationSummary, Repository } from "./repository.js";

function propertyFromRow(row: any): PropertyRecord {
  return {
    id: row.id,
    hostWallet: row.host_wallet,
    title: row.title,
    location: row.location,
    priceWorld: Number(row.price_world),
    propertyAuthorityVerified: row.property_authority_verified,
    status: row.status
  };
}

function bookingFromRow(row: any): BookingRecord {
  return {
    id: row.id,
    propertyId: row.property_id,
    memberNeopassId: row.member_neopass_id,
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: new Date(row.ends_at).toISOString(),
    amountWorld: Number(row.amount_world),
    state: row.state,
    entitlement: row.entitlement_status,
    checkout: row.checkout_id ? { checkoutId: row.checkout_id } : undefined
  };
}

export class PostgresRepository implements Repository {
  readonly mode = "postgres" as const;
  private readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async getProperty(id: string) {
    const { rows } = await this.pool.query("SELECT * FROM neo_pads_properties WHERE id=$1", [id]);
    return rows[0] ? propertyFromRow(rows[0]) : undefined;
  }

  async listActiveProperties(location = "") {
    const q = `%${location}%`;
    const { rows } = await this.pool.query(
      "SELECT * FROM neo_pads_properties WHERE status='ACTIVE' AND ($1='' OR lower(location) LIKE lower($2)) ORDER BY created_at DESC",
      [location, q]
    );
    return rows.map(propertyFromRow);
  }

  async saveProperty(value: PropertyRecord) {
    await this.pool.query(
      `INSERT INTO neo_pads_properties(id,host_wallet,title,location,price_world,property_authority_verified,status)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT(id) DO UPDATE SET host_wallet=EXCLUDED.host_wallet,title=EXCLUDED.title,location=EXCLUDED.location,
         price_world=EXCLUDED.price_world,property_authority_verified=EXCLUDED.property_authority_verified,status=EXCLUDED.status`,
      [value.id, value.hostWallet, value.title, value.location, value.priceWorld, value.propertyAuthorityVerified, value.status]
    );
  }

  async getBooking(id: string) {
    const { rows } = await this.pool.query("SELECT * FROM neo_pads_bookings WHERE id=$1", [id]);
    return rows[0] ? bookingFromRow(rows[0]) : undefined;
  }

  async saveBooking(value: BookingRecord) {
    const checkoutId = (value.checkout as any)?.checkoutId ?? (value.checkout as any)?.id ?? null;
    await this.pool.query(
      `INSERT INTO neo_pads_bookings(id,property_id,member_neopass_id,starts_at,ends_at,amount_world,state,entitlement_status,checkout_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT(id) DO UPDATE SET state=EXCLUDED.state,entitlement_status=EXCLUDED.entitlement_status,checkout_id=EXCLUDED.checkout_id`,
      [value.id, value.propertyId, value.memberNeopassId, value.startsAt, value.endsAt, value.amountWorld, value.state, value.entitlement, checkoutId]
    );
  }

  async markWalletVerified(wallet: string, challengeId: string) {
    await this.pool.query(
      `INSERT INTO neo_pads_wallet_verifications(wallet,challenge_id,verified_at)
       VALUES($1,$2,now()) ON CONFLICT(wallet) DO UPDATE SET challenge_id=EXCLUDED.challenge_id,verified_at=now()`,
      [wallet, challengeId]
    );
  }

  async isWalletVerified(wallet: string) {
    const { rowCount } = await this.pool.query(
      "SELECT 1 FROM neo_pads_wallet_verifications WHERE wallet=$1 AND (expires_at IS NULL OR expires_at > now())",
      [wallet]
    );
    return (rowCount ?? 0) > 0;
  }

  async hasWebhookEvent(eventId: string) {
    const { rowCount } = await this.pool.query("SELECT 1 FROM neo_pads_payment_events WHERE event_id=$1", [eventId]);
    return (rowCount ?? 0) > 0;
  }

  private async withTx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const out = await fn(client);
      await client.query("COMMIT");
      return out;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async applyPaymentEvent(input: { eventId: string; bookingId: string; status: string; rawPayload: Buffer }) {
    return this.withTx(async (client) => {
      const hash = crypto.createHash("sha256").update(input.rawPayload).digest("hex");
      const inserted = await client.query(
        `INSERT INTO neo_pads_payment_events(event_id,booking_id,event_type,payload_sha256)
         VALUES($1,$2,$3,$4) ON CONFLICT(event_id) DO NOTHING RETURNING event_id`,
        [input.eventId, input.bookingId, input.status, hash]
      );
      if (!inserted.rowCount) return { duplicate: true };

      const current = await client.query("SELECT * FROM neo_pads_bookings WHERE id=$1 FOR UPDATE", [input.bookingId]);
      if (!current.rows[0]) throw new Error("booking_not_found");
      const booking = bookingFromRow(current.rows[0]);

      if (input.status === "SETTLED") {
        booking.state = "CONFIRMED";
        booking.entitlement = "ACTIVE";
      } else if (input.status === "REFUNDED") {
        booking.state = "REFUNDED";
        booking.entitlement = "REVOKED";
      } else if (input.status === "DISPUTED") {
        booking.state = "DISPUTED";
        booking.entitlement = "REVOKED";
      }

      await client.query(
        "UPDATE neo_pads_bookings SET state=$2, entitlement_status=$3 WHERE id=$1",
        [booking.id, booking.state, booking.entitlement]
      );
      await client.query(
        `INSERT INTO neo_pads_audit_log(aggregate_type,aggregate_id,event_type,actor_type,next_state)
         VALUES('BOOKING',$1,$2,'NEO_COUNTER',$3::jsonb)`,
        [booking.id, input.status, JSON.stringify({ state: booking.state, entitlement: booking.entitlement })]
      );
      return { duplicate: false, booking };
    });
  }

  async ping() {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  async getReconciliationSummary(): Promise<ReconciliationSummary> {
    const { rows } = await this.pool.query(`
      SELECT
        (SELECT count(*)::int FROM neo_pads_payments WHERE status NOT IN ('SETTLED','REFUNDED','FAILED')) AS pending_payments,
        (SELECT count(*)::int FROM neo_pads_payments p LEFT JOIN neo_pads_host_payouts hp ON hp.booking_id=p.booking_id WHERE p.status='SETTLED' AND hp.id IS NULL) AS settled_without_payout,
        (SELECT count(*)::int FROM neo_pads_host_payouts WHERE status IN ('PENDING','AUTHORIZED','SUBMITTED')) AS pending_payouts,
        (SELECT count(*)::int FROM neo_pads_host_payouts WHERE status='FAILED') AS failed_payouts,
        (SELECT count(*)::int FROM neo_pads_payment_events WHERE received_at >= now() - interval '24 hours') AS recent_events
    `);
    const row = rows[0] ?? {};
    return {
      supported: true,
      generatedAt: new Date().toISOString(),
      pendingPayments: Number(row.pending_payments ?? 0),
      settledPaymentsWithoutPayout: Number(row.settled_without_payout ?? 0),
      pendingPayouts: Number(row.pending_payouts ?? 0),
      failedPayouts: Number(row.failed_payouts ?? 0),
      recentPaymentEvents: Number(row.recent_events ?? 0)
    };
  }

  async close() {
    await this.pool.end();
  }
}
