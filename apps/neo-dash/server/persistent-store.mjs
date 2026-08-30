import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

function clone(value){return value==null?value:structuredClone(value);}
function now(){return new Date().toISOString();}
function encode(value){return JSON.stringify(value??null);}
function decode(value,fallback=null){try{return value==null?fallback:JSON.parse(value);}catch{return fallback;}}

export function createSqliteStore(dbPath='data/neo-dash.sqlite'){
  if(dbPath!==':memory:') mkdirSync(dirname(dbPath),{recursive:true});
  const db=new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS providers (id TEXT PRIMARY KEY,account_id TEXT NOT NULL,requested_roles TEXT NOT NULL,roles TEXT NOT NULL,authorities TEXT NOT NULL,status TEXT NOT NULL,suspended INTEGER NOT NULL DEFAULT 0,active_exclusive_job_id TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_neo_dash_providers_account ON providers(account_id);
    CREATE TABLE IF NOT EXISTS quotes (id TEXT PRIMARY KEY,customer_id TEXT NOT NULL,service_type TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY,customer_id TEXT NOT NULL,provider_id TEXT,service_type TEXT NOT NULL,state TEXT NOT NULL,settlement_asset TEXT,checkout_id TEXT,payload TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_neo_dash_jobs_customer ON jobs(customer_id); CREATE INDEX IF NOT EXISTS idx_neo_dash_jobs_provider ON jobs(provider_id); CREATE INDEX IF NOT EXISTS idx_neo_dash_jobs_state ON jobs(state);
    CREATE TABLE IF NOT EXISTS vehicles (id TEXT PRIMARY KEY,provider_id TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_neo_dash_vehicles_provider ON vehicles(provider_id);
    CREATE TABLE IF NOT EXISTS merchants (id TEXT PRIMARY KEY,account_id TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_neo_dash_merchants_account ON merchants(account_id);
    CREATE TABLE IF NOT EXISTS dispatch_offers (id TEXT PRIMARY KEY,job_id TEXT NOT NULL,provider_id TEXT NOT NULL,state TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_neo_dash_dispatch_job ON dispatch_offers(job_id); CREATE INDEX IF NOT EXISTS idx_neo_dash_dispatch_provider ON dispatch_offers(provider_id);
    CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY,job_id TEXT NOT NULL,checkout_id TEXT,settlement_asset TEXT,state TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_neo_dash_payments_job ON payments(job_id);
    CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,event_type TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_neo_dash_audit_entity ON audit_events(entity_type,entity_id,created_at);
  `);

  const providerFromRow=row=>row?{id:row.id,accountId:row.account_id,requestedRoles:decode(row.requested_roles,[]),roles:decode(row.roles,[]),authorities:decode(row.authorities,{}),status:row.status,suspended:Boolean(row.suspended),activeExclusiveJobId:row.active_exclusive_job_id||null,createdAt:row.created_at,updatedAt:row.updated_at}:null;
  const payload=row=>row?decode(row.payload,null):null;
  const audit=(entityType,entityId,eventType,data={})=>db.prepare(`INSERT INTO audit_events(id,entity_type,entity_id,event_type,payload,created_at) VALUES(?,?,?,?,?,?)`).run(randomUUID(),entityType,entityId,eventType,encode(data),now());
  const listPayload=(sql,...args)=>db.prepare(sql).all(...args).map(payload).map(clone);

  const api={
    db,close(){db.close();},
    createProviderApplication(input={}){const id=randomUUID(),stamp=now();const provider={id,accountId:String(input.accountId||''),requestedRoles:Array.isArray(input.requestedRoles)?[...new Set(input.requestedRoles)]:[],roles:[],authorities:{},status:'PENDING',suspended:false,activeExclusiveJobId:null,createdAt:stamp,updatedAt:stamp};db.prepare(`INSERT INTO providers(id,account_id,requested_roles,roles,authorities,status,suspended,active_exclusive_job_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(id,provider.accountId,encode(provider.requestedRoles),encode([]),encode({}),provider.status,0,null,stamp,stamp);audit('provider',id,'PROVIDER_APPLICATION_CREATED',{accountId:provider.accountId,requestedRoles:provider.requestedRoles});return clone(provider);},
    getProvider(id){return clone(providerFromRow(db.prepare(`SELECT * FROM providers WHERE id=?`).get(id)));},
    approveProvider(id,{roles=[],authorities={}}={}){const current=api.getProvider(id);if(!current)return null;current.roles=[...new Set(roles)];current.authorities={...authorities};current.status='APPROVED';current.updatedAt=now();db.prepare(`UPDATE providers SET roles=?,authorities=?,status=?,updated_at=? WHERE id=?`).run(encode(current.roles),encode(current.authorities),current.status,current.updatedAt,id);audit('provider',id,'PROVIDER_APPROVED',{roles:current.roles,authorities:current.authorities});return clone(current);},
    listProviders(){return db.prepare(`SELECT * FROM providers ORDER BY created_at ASC`).all().map(providerFromRow).map(clone);},
    saveProvider(provider){provider.updatedAt=now();db.prepare(`UPDATE providers SET account_id=?,requested_roles=?,roles=?,authorities=?,status=?,suspended=?,active_exclusive_job_id=?,updated_at=? WHERE id=?`).run(provider.accountId,encode(provider.requestedRoles||[]),encode(provider.roles||[]),encode(provider.authorities||{}),provider.status||'PENDING',provider.suspended?1:0,provider.activeExclusiveJobId||null,provider.updatedAt,provider.id);audit('provider',provider.id,'PROVIDER_UPDATED',{status:provider.status,activeExclusiveJobId:provider.activeExclusiveJobId||null});return clone(provider);},
    createQuote(quote){const id=randomUUID();const value={id,...quote,createdAt:now()};db.prepare(`INSERT INTO quotes(id,customer_id,service_type,payload,created_at) VALUES(?,?,?,?,?)`).run(id,value.customerId,value.serviceType,encode(value),value.createdAt);audit('quote',id,'QUOTE_CREATED',{customerId:value.customerId,serviceType:value.serviceType,commercialAmountWorld:value.commercialAmountWorld});return clone(value);},
    getQuote(id){return clone(payload(db.prepare(`SELECT payload FROM quotes WHERE id=?`).get(id)));},
    createJob(input){const id=randomUUID(),stamp=now();const value={id,providerId:null,checkoutId:null,state:'QUOTED',createdAt:stamp,updatedAt:stamp,...input};db.prepare(`INSERT INTO jobs(id,customer_id,provider_id,service_type,state,settlement_asset,checkout_id,payload,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(id,value.customerId,value.providerId||null,value.serviceType,value.state,value.settlementAsset||null,value.checkoutId||null,encode(value),stamp,stamp);audit('job',id,'JOB_CREATED',{customerId:value.customerId,serviceType:value.serviceType,state:value.state});return clone(value);},
    getJob(id){return clone(payload(db.prepare(`SELECT payload FROM jobs WHERE id=?`).get(id)));},
    saveJob(job){job.updatedAt=now();db.prepare(`UPDATE jobs SET provider_id=?,state=?,settlement_asset=?,checkout_id=?,payload=?,updated_at=? WHERE id=?`).run(job.providerId||null,job.state,job.settlementAsset||null,job.checkoutId||null,encode(job),job.updatedAt,job.id);audit('job',job.id,'JOB_UPDATED',{state:job.state,providerId:job.providerId||null,checkoutId:job.checkoutId||null});return clone(job);},
    listJobs(){return listPayload(`SELECT payload FROM jobs ORDER BY created_at ASC`);},
    createVehicle(input={}){const id=randomUUID(),stamp=now();const value={id,providerId:String(input.providerId||''),status:input.status||'PENDING',...input,createdAt:stamp,updatedAt:stamp};db.prepare(`INSERT INTO vehicles(id,provider_id,payload,status,created_at,updated_at) VALUES(?,?,?,?,?,?)`).run(id,value.providerId,encode(value),value.status,stamp,stamp);audit('vehicle',id,'VEHICLE_CREATED',{providerId:value.providerId,status:value.status});return clone(value);},
    getVehicle(id){return clone(payload(db.prepare(`SELECT payload FROM vehicles WHERE id=?`).get(id)));},
    listVehicles(providerId){return providerId?listPayload(`SELECT payload FROM vehicles WHERE provider_id=? ORDER BY created_at ASC`,providerId):listPayload(`SELECT payload FROM vehicles ORDER BY created_at ASC`);},
    createMerchant(input={}){const id=randomUUID(),stamp=now();const value={id,accountId:String(input.accountId||''),status:input.status||'PENDING',...input,createdAt:stamp,updatedAt:stamp};db.prepare(`INSERT INTO merchants(id,account_id,payload,status,created_at,updated_at) VALUES(?,?,?,?,?,?)`).run(id,value.accountId,encode(value),value.status,stamp,stamp);audit('merchant',id,'MERCHANT_CREATED',{accountId:value.accountId,status:value.status});return clone(value);},
    getMerchant(id){return clone(payload(db.prepare(`SELECT payload FROM merchants WHERE id=?`).get(id)));},
    listMerchants(accountId){return accountId?listPayload(`SELECT payload FROM merchants WHERE account_id=? ORDER BY created_at ASC`,accountId):listPayload(`SELECT payload FROM merchants ORDER BY created_at ASC`);},
    createDispatchOffer(input={}){const id=randomUUID(),stamp=now();const value={id,state:input.state||'OFFERED',...input,createdAt:stamp,updatedAt:stamp};db.prepare(`INSERT INTO dispatch_offers(id,job_id,provider_id,state,payload,created_at,updated_at) VALUES(?,?,?,?,?,?,?)`).run(id,value.jobId,value.providerId,value.state,encode(value),stamp,stamp);audit('dispatch_offer',id,'DISPATCH_OFFER_CREATED',{jobId:value.jobId,providerId:value.providerId,state:value.state});return clone(value);},
    getDispatchOffer(id){return clone(payload(db.prepare(`SELECT payload FROM dispatch_offers WHERE id=?`).get(id)));},
    listDispatchOffers({jobId,providerId}={}){if(jobId&&providerId)return listPayload(`SELECT payload FROM dispatch_offers WHERE job_id=? AND provider_id=? ORDER BY created_at ASC`,jobId,providerId);if(jobId)return listPayload(`SELECT payload FROM dispatch_offers WHERE job_id=? ORDER BY created_at ASC`,jobId);if(providerId)return listPayload(`SELECT payload FROM dispatch_offers WHERE provider_id=? ORDER BY created_at ASC`,providerId);return listPayload(`SELECT payload FROM dispatch_offers ORDER BY created_at ASC`);},
    recordPayment(input={}){const id=randomUUID(),stamp=now();const value={id,state:input.state||'PENDING',...input,createdAt:stamp,updatedAt:stamp};db.prepare(`INSERT INTO payments(id,job_id,checkout_id,settlement_asset,state,payload,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)`).run(id,value.jobId,value.checkoutId||null,value.settlementAsset||null,value.state,encode(value),stamp,stamp);audit('payment',id,'PAYMENT_RECORDED',{jobId:value.jobId,state:value.state,checkoutId:value.checkoutId||null});return clone(value);},
    getPayment(id){return clone(payload(db.prepare(`SELECT payload FROM payments WHERE id=?`).get(id)));},
    listPayments(jobId){return jobId?listPayload(`SELECT payload FROM payments WHERE job_id=? ORDER BY created_at ASC`,jobId):listPayload(`SELECT payload FROM payments ORDER BY created_at ASC`);},
    listAuditEvents(entityType,entityId){if(entityType&&entityId)return db.prepare(`SELECT * FROM audit_events WHERE entity_type=? AND entity_id=? ORDER BY created_at ASC`).all(entityType,entityId).map(row=>({id:row.id,entityType:row.entity_type,entityId:row.entity_id,eventType:row.event_type,payload:decode(row.payload,{}),createdAt:row.created_at}));return [];}
  };
  return api;
}
