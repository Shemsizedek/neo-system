import pg from 'pg';
import type { PropertyRecord } from './server.js';

const { Pool } = pg;

export interface PropertySearch {
  q?: string;
  listingType?: string;
  propertyType?: string;
  activeOnly?: boolean;
}

export interface PropertyRepository {
  create(property: PropertyRecord): Promise<PropertyRecord>;
  get(id: string): Promise<PropertyRecord | null>;
  search(search: PropertySearch): Promise<PropertyRecord[]>;
  setAuthority(id: string, decision: 'verified' | 'rejected', method: string): Promise<PropertyRecord | null>;
  clear(): Promise<void>;
  ready(): Promise<boolean>;
}

function rowToProperty(row: any): PropertyRecord {
  return {
    id: row.id,
    listingType: row.listing_type,
    propertyType: row.property_type,
    status: row.status,
    address: {
      line1: row.line1,
      line2: row.line2 ?? undefined,
      city: row.city,
      region: row.region,
      postalCode: row.postal_code,
      country: row.country,
      latitude: row.latitude == null ? undefined : Number(row.latitude),
      longitude: row.longitude == null ? undefined : Number(row.longitude)
    },
    facts: row.facts ?? undefined,
    pricing: row.pricing ?? {},
    authority: {
      claimStatus: row.authority_status,
      verifiedAt: row.authority_verified_at ? new Date(row.authority_verified_at).toISOString() : null,
      verificationMethod: row.authority_verification_method ?? null
    },
    neo: row.neo ?? undefined,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

export class MemoryPropertyRepository implements PropertyRepository {
  private properties = new Map<string, PropertyRecord>();

  async create(property: PropertyRecord) {
    this.properties.set(property.id, property);
    return property;
  }

  async get(id: string) {
    return this.properties.get(id) ?? null;
  }

  async search(search: PropertySearch) {
    const q = (search.q ?? '').trim().toLowerCase();
    return [...this.properties.values()].filter((p) => {
      if (search.activeOnly !== false && p.status !== 'active') return false;
      if (search.listingType && p.listingType !== search.listingType && p.listingType !== 'both') return false;
      if (search.propertyType && p.propertyType !== search.propertyType) return false;
      if (q) {
        const haystack = `${p.address.line1} ${p.address.city} ${p.address.region} ${p.address.postalCode}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }

  async setAuthority(id: string, decision: 'verified' | 'rejected', method: string) {
    const property = this.properties.get(id);
    if (!property) return null;
    const now = new Date().toISOString();
    property.authority = {
      claimStatus: decision,
      verifiedAt: decision === 'verified' ? now : null,
      verificationMethod: method
    };
    property.status = decision === 'verified' ? 'active' : 'off_market';
    property.updatedAt = now;
    this.properties.set(id, property);
    return property;
  }

  async clear() {
    this.properties.clear();
  }

  async ready() {
    return true;
  }
}

export class PostgresPropertyRepository implements PropertyRepository {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async create(property: PropertyRecord) {
    const result = await this.pool.query(
      `INSERT INTO neo_realty_properties (
        id, listing_type, property_type, status,
        line1, line2, city, region, postal_code, country, latitude, longitude,
        facts, pricing, neo, authority_status, authority_verified_at,
        authority_verification_method, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
        $13::jsonb,$14::jsonb,$15::jsonb,$16,$17,$18,$19,$20
      ) RETURNING *`,
      [
        property.id, property.listingType, property.propertyType, property.status,
        property.address.line1, property.address.line2 ?? null, property.address.city,
        property.address.region, property.address.postalCode, property.address.country,
        property.address.latitude ?? null, property.address.longitude ?? null,
        JSON.stringify(property.facts ?? {}), JSON.stringify(property.pricing ?? {}),
        JSON.stringify(property.neo ?? {}), property.authority.claimStatus,
        property.authority.verifiedAt, property.authority.verificationMethod,
        property.createdAt, property.updatedAt
      ]
    );
    return rowToProperty(result.rows[0]);
  }

  async get(id: string) {
    const result = await this.pool.query('SELECT * FROM neo_realty_properties WHERE id = $1', [id]);
    return result.rowCount ? rowToProperty(result.rows[0]) : null;
  }

  async search(search: PropertySearch) {
    const clauses: string[] = [];
    const values: unknown[] = [];
    const add = (sql: string, value: unknown) => {
      values.push(value);
      clauses.push(sql.replace('?', `$${values.length}`));
    };

    if (search.activeOnly !== false) clauses.push("status = 'active'");
    if (search.listingType) add("(listing_type = ? OR listing_type = 'both')", search.listingType);
    if (search.propertyType) add('property_type = ?', search.propertyType);
    if (search.q?.trim()) {
      add("lower(concat_ws(' ', line1, city, region, postal_code)) LIKE ?", `%${search.q.trim().toLowerCase()}%`);
    }

    const sql = `SELECT * FROM neo_realty_properties ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY updated_at DESC LIMIT 500`;
    const result = await this.pool.query(sql, values);
    return result.rows.map(rowToProperty);
  }

  async setAuthority(id: string, decision: 'verified' | 'rejected', method: string) {
    const result = await this.pool.query(
      `UPDATE neo_realty_properties
       SET authority_status = $2,
           authority_verified_at = CASE WHEN $2 = 'verified' THEN now() ELSE NULL END,
           authority_verification_method = $3,
           status = CASE WHEN $2 = 'verified' THEN 'active' ELSE 'off_market' END,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, decision, method]
    );
    return result.rowCount ? rowToProperty(result.rows[0]) : null;
  }

  async clear() {
    await this.pool.query('TRUNCATE neo_realty_authority_evidence, neo_realty_properties CASCADE');
  }

  async ready() {
    try {
      await this.pool.query('SELECT 1 FROM neo_realty_properties LIMIT 1');
      return true;
    } catch {
      return false;
    }
  }
}

export function createPropertyRepository(): PropertyRepository {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  return databaseUrl ? new PostgresPropertyRepository(databaseUrl) : new MemoryPropertyRepository();
}
