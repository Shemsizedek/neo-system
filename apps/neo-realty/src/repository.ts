import pg from 'pg';
import crypto from 'node:crypto';
import type { PropertyRecord } from './server.js';

const { Pool } = pg;

export interface PropertySearch {
  q?: string;
  listingType?: string;
  propertyType?: string;
  activeOnly?: boolean;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}

export interface AuthorityEvidence {
  id: string;
  propertyId: string;
  evidenceType: string;
  reference: string;
  sha256: string | null;
  reviewStatus: 'pending' | 'accepted' | 'rejected';
  reviewedAt: string | null;
  reviewerNote: string | null;
  createdAt: string;
}

export interface PropertyRepository {
  create(property: PropertyRecord): Promise<PropertyRecord>;
  get(id: string): Promise<PropertyRecord | null>;
  search(search: PropertySearch): Promise<PropertyRecord[]>;
  setAuthority(id: string, decision: 'verified' | 'rejected', method: string): Promise<PropertyRecord | null>;
  addEvidence(propertyId: string, evidenceType: string, reference: string, sha256?: string | null): Promise<AuthorityEvidence | null>;
  listEvidence(propertyId: string): Promise<AuthorityEvidence[]>;
  reviewEvidence(evidenceId: string, decision: 'accepted' | 'rejected', note: string): Promise<AuthorityEvidence | null>;
  clear(): Promise<void>;
  ready(): Promise<boolean>;
}

function rowToProperty(row: any): PropertyRecord {
  return {
    id: row.id, listingType: row.listing_type, propertyType: row.property_type, status: row.status,
    address: { line1: row.line1, line2: row.line2 ?? undefined, city: row.city, region: row.region, postalCode: row.postal_code, country: row.country, latitude: row.latitude == null ? undefined : Number(row.latitude), longitude: row.longitude == null ? undefined : Number(row.longitude) },
    facts: row.facts ?? undefined, pricing: row.pricing ?? {},
    authority: { claimStatus: row.authority_status, verifiedAt: row.authority_verified_at ? new Date(row.authority_verified_at).toISOString() : null, verificationMethod: row.authority_verification_method ?? null },
    neo: row.neo ?? undefined, createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString()
  };
}

function rowToEvidence(row: any): AuthorityEvidence {
  return { id: row.id, propertyId: row.property_id, evidenceType: row.evidence_type, reference: row.reference, sha256: row.sha256 ?? null, reviewStatus: row.review_status, reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null, reviewerNote: row.reviewer_note ?? null, createdAt: new Date(row.created_at).toISOString() };
}

export class MemoryPropertyRepository implements PropertyRepository {
  private properties = new Map<string, PropertyRecord>();
  private evidence = new Map<string, AuthorityEvidence>();
  async create(property: PropertyRecord) { this.properties.set(property.id, property); return property; }
  async get(id: string) { return this.properties.get(id) ?? null; }
  async search(search: PropertySearch) {
    const q = (search.q ?? '').trim().toLowerCase();
    return [...this.properties.values()].filter((p) => {
      if (search.activeOnly !== false && p.status !== 'active') return false;
      if (search.listingType && p.listingType !== search.listingType && p.listingType !== 'both') return false;
      if (search.propertyType && p.propertyType !== search.propertyType) return false;
      if (q && !`${p.address.line1} ${p.address.city} ${p.address.region} ${p.address.postalCode}`.toLowerCase().includes(q)) return false;
      const lat = p.address.latitude, lng = p.address.longitude;
      if (search.minLat != null && (lat == null || lat < search.minLat)) return false;
      if (search.maxLat != null && (lat == null || lat > search.maxLat)) return false;
      if (search.minLng != null && (lng == null || lng < search.minLng)) return false;
      if (search.maxLng != null && (lng == null || lng > search.maxLng)) return false;
      return true;
    });
  }
  async setAuthority(id: string, decision: 'verified' | 'rejected', method: string) {
    const p = this.properties.get(id); if (!p) return null; const now = new Date().toISOString();
    p.authority = { claimStatus: decision, verifiedAt: decision === 'verified' ? now : null, verificationMethod: method }; p.status = decision === 'verified' ? 'active' : 'off_market'; p.updatedAt = now; return p;
  }
  async addEvidence(propertyId: string, evidenceType: string, reference: string, sha256?: string | null) {
    if (!this.properties.has(propertyId)) return null;
    const row: AuthorityEvidence = { id: crypto.randomUUID(), propertyId, evidenceType, reference, sha256: sha256 ?? null, reviewStatus: 'pending', reviewedAt: null, reviewerNote: null, createdAt: new Date().toISOString() };
    this.evidence.set(row.id, row); return row;
  }
  async listEvidence(propertyId: string) { return [...this.evidence.values()].filter((e) => e.propertyId === propertyId); }
  async reviewEvidence(id: string, decision: 'accepted' | 'rejected', note: string) { const e = this.evidence.get(id); if (!e) return null; e.reviewStatus = decision; e.reviewedAt = new Date().toISOString(); e.reviewerNote = note; return e; }
  async clear() { this.properties.clear(); this.evidence.clear(); }
  async ready() { return true; }
}

export class PostgresPropertyRepository implements PropertyRepository {
  private pool: pg.Pool;
  constructor(connectionString: string) { this.pool = new Pool({ connectionString }); }
  async create(property: PropertyRecord) {
    const r = await this.pool.query(`INSERT INTO neo_realty_properties (id,listing_type,property_type,status,line1,line2,city,region,postal_code,country,latitude,longitude,facts,pricing,neo,authority_status,authority_verified_at,authority_verification_method,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15::jsonb,$16,$17,$18,$19,$20) RETURNING *`, [property.id,property.listingType,property.propertyType,property.status,property.address.line1,property.address.line2??null,property.address.city,property.address.region,property.address.postalCode,property.address.country,property.address.latitude??null,property.address.longitude??null,JSON.stringify(property.facts??{}),JSON.stringify(property.pricing??{}),JSON.stringify(property.neo??{}),property.authority.claimStatus,property.authority.verifiedAt,property.authority.verificationMethod,property.createdAt,property.updatedAt]);
    return rowToProperty(r.rows[0]);
  }
  async get(id: string) { const r = await this.pool.query('SELECT * FROM neo_realty_properties WHERE id=$1',[id]); return r.rowCount ? rowToProperty(r.rows[0]) : null; }
  async search(search: PropertySearch) {
    const c: string[]=[]; const v: unknown[]=[]; const add=(sql:string,value:unknown)=>{v.push(value);c.push(sql.replace('?',`$${v.length}`));};
    if(search.activeOnly!==false)c.push("status='active'"); if(search.listingType)add("(listing_type=? OR listing_type='both')",search.listingType); if(search.propertyType)add('property_type=?',search.propertyType); if(search.q?.trim())add("lower(concat_ws(' ',line1,city,region,postal_code)) LIKE ?",`%${search.q.trim().toLowerCase()}%`);
    if(search.minLat!=null)add('latitude>=?',search.minLat); if(search.maxLat!=null)add('latitude<=?',search.maxLat); if(search.minLng!=null)add('longitude>=?',search.minLng); if(search.maxLng!=null)add('longitude<=?',search.maxLng);
    const r=await this.pool.query(`SELECT * FROM neo_realty_properties ${c.length?`WHERE ${c.join(' AND ')}`:''} ORDER BY updated_at DESC LIMIT 500`,v); return r.rows.map(rowToProperty);
  }
  async setAuthority(id:string,decision:'verified'|'rejected',method:string){const r=await this.pool.query(`UPDATE neo_realty_properties SET authority_status=$2,authority_verified_at=CASE WHEN $2='verified' THEN now() ELSE NULL END,authority_verification_method=$3,status=CASE WHEN $2='verified' THEN 'active' ELSE 'off_market' END,updated_at=now() WHERE id=$1 RETURNING *`,[id,decision,method]);return r.rowCount?rowToProperty(r.rows[0]):null;}
  async addEvidence(propertyId:string,evidenceType:string,reference:string,sha256?:string|null){const r=await this.pool.query(`INSERT INTO neo_realty_authority_evidence(property_id,evidence_type,reference,sha256) SELECT $1,$2,$3,$4 WHERE EXISTS(SELECT 1 FROM neo_realty_properties WHERE id=$1) RETURNING *`,[propertyId,evidenceType,reference,sha256??null]);return r.rowCount?rowToEvidence(r.rows[0]):null;}
  async listEvidence(propertyId:string){const r=await this.pool.query('SELECT * FROM neo_realty_authority_evidence WHERE property_id=$1 ORDER BY created_at DESC',[propertyId]);return r.rows.map(rowToEvidence);}
  async reviewEvidence(id:string,decision:'accepted'|'rejected',note:string){const r=await this.pool.query(`UPDATE neo_realty_authority_evidence SET review_status=$2,reviewed_at=now(),reviewer_note=$3 WHERE id=$1 RETURNING *`,[id,decision,note]);return r.rowCount?rowToEvidence(r.rows[0]):null;}
  async clear(){await this.pool.query('TRUNCATE neo_realty_authority_evidence,neo_realty_properties CASCADE');}
  async ready(){try{await this.pool.query('SELECT 1 FROM neo_realty_properties LIMIT 1');return true;}catch{return false;}}
}

export function createPropertyRepository(): PropertyRepository { const databaseUrl=process.env.DATABASE_URL?.trim(); return databaseUrl?new PostgresPropertyRepository(databaseUrl):new MemoryPropertyRepository(); }
