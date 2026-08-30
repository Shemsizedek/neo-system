import crypto from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;

export interface MediaRef {
  id: string;
  propertyId: string;
  kind: 'image' | 'document';
  reference: string;
  contentType: string | null;
  sha256: string | null;
  label: string | null;
  sortOrder: number;
  visibility: 'public' | 'private' | 'authority_only';
  createdBy: string;
  createdAt: string;
}

export interface SellerStore {
  assign(propertyId: string, principalId: string, role: 'seller' | 'agent'): Promise<void>;
  owns(propertyId: string, principalId: string): Promise<boolean>;
  addMedia(propertyId: string, principalId: string, input: Omit<MediaRef,'id'|'propertyId'|'createdBy'|'createdAt'>): Promise<MediaRef>;
  listMedia(propertyId: string, includePrivate?: boolean): Promise<MediaRef[]>;
}

class MemorySellerStore implements SellerStore {
  private owners = new Map<string, Set<string>>();
  private media = new Map<string, MediaRef[]>();
  async assign(propertyId:string, principalId:string){ const s=this.owners.get(propertyId)??new Set<string>(); s.add(principalId); this.owners.set(propertyId,s); }
  async owns(propertyId:string, principalId:string){ return this.owners.get(propertyId)?.has(principalId)??false; }
  async addMedia(propertyId:string, principalId:string, input:Omit<MediaRef,'id'|'propertyId'|'createdBy'|'createdAt'>){ const row:MediaRef={...input,id:crypto.randomUUID(),propertyId,createdBy:principalId,createdAt:new Date().toISOString()}; const rows=this.media.get(propertyId)??[]; rows.push(row); this.media.set(propertyId,rows); return row; }
  async listMedia(propertyId:string, includePrivate=false){ return (this.media.get(propertyId)??[]).filter(r=>includePrivate||r.visibility==='public').sort((a,b)=>a.sortOrder-b.sortOrder); }
}

class PostgresSellerStore implements SellerStore {
  private pool:pg.Pool;
  constructor(url:string){ this.pool=new Pool({connectionString:url}); }
  async assign(propertyId:string, principalId:string, role:'seller'|'agent'){ await this.pool.query(`INSERT INTO neo_realty_listing_principals(property_id,principal_id,role) VALUES($1,$2,$3) ON CONFLICT(property_id,principal_id) DO UPDATE SET role=EXCLUDED.role`,[propertyId,principalId,role]); }
  async owns(propertyId:string, principalId:string){ const r=await this.pool.query('SELECT 1 FROM neo_realty_listing_principals WHERE property_id=$1 AND principal_id=$2',[propertyId,principalId]); return Boolean(r.rowCount); }
  async addMedia(propertyId:string, principalId:string, input:Omit<MediaRef,'id'|'propertyId'|'createdBy'|'createdAt'>){ const r=await this.pool.query(`INSERT INTO neo_realty_media_refs(property_id,kind,reference,content_type,sha256,label,sort_order,visibility,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[propertyId,input.kind,input.reference,input.contentType,input.sha256,input.label,input.sortOrder,input.visibility,principalId]); return row(r.rows[0]); }
  async listMedia(propertyId:string, includePrivate=false){ const r=await this.pool.query(`SELECT * FROM neo_realty_media_refs WHERE property_id=$1 ${includePrivate?'':"AND visibility='public'"} ORDER BY sort_order,created_at`,[propertyId]); return r.rows.map(row); }
}

function row(r:any):MediaRef{return{id:r.id,propertyId:r.property_id,kind:r.kind,reference:r.reference,contentType:r.content_type??null,sha256:r.sha256??null,label:r.label??null,sortOrder:Number(r.sort_order??0),visibility:r.visibility,createdBy:r.created_by,createdAt:new Date(r.created_at).toISOString()};}

export function createSellerStore():SellerStore{const url=process.env.DATABASE_URL?.trim();return url?new PostgresSellerStore(url):new MemorySellerStore();}
