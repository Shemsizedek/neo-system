import { randomUUID } from 'node:crypto';

export const OUTREACH_STATUSES=Object.freeze([
  'draft',
  'pending_approval',
  'approved',
  'awaiting_provider',
  'delivered',
  'failed',
  'replied',
  'closed'
]);

const clean=(v,max=1000)=>String(v??'').trim().slice(0,max);
const nowIso=()=>new Date().toISOString();

export function normalizeOutreach(input={},existing=null){
  const status=clean(input.status||existing?.status||'draft',40);
  if(!OUTREACH_STATUSES.includes(status)) throw new Error('invalid_outreach_status');
  const prospectId=clean(input.prospectId||existing?.prospectId,120);
  const organization=clean(input.organization||existing?.organization,160);
  const subject=clean(input.subject??existing?.subject,220);
  const body=clean(input.body??existing?.body,12000);
  if(!prospectId) throw new Error('prospect_id_required');
  if(!organization) throw new Error('organization_required');
  if(!subject) throw new Error('subject_required');
  if(!body) throw new Error('body_required');
  return {
    prospectId,
    organization,
    decisionMaker:clean(input.decisionMaker??existing?.decisionMaker,140),
    decisionRole:clean(input.decisionRole??existing?.decisionRole,140),
    publicContact:clean(input.publicContact??existing?.publicContact,500),
    channel:clean(input.channel||existing?.channel||'public_business_contact_route',80),
    provider:clean(input.provider||existing?.provider||'NEO_MAIL',80),
    dealClass:clean(input.dealClass??existing?.dealClass,80),
    subject,
    body,
    status,
    approvalClass:clean(input.approvalClass ?? existing?.approvalClass ?? 'commercial',80),
    approvalReasons:Array.isArray(input.approvalReasons)?input.approvalReasons.slice(0,12).map(x=>clean(x,100)):(existing?.approvalReasons||[]),
    approvedBy:clean(input.approvedBy??existing?.approvedBy,160),
    approvedAt:clean(input.approvedAt??existing?.approvedAt,80),
    providerRef:clean(input.providerRef??existing?.providerRef,240),
    providerReceipt:input.providerReceipt??existing?.providerReceipt??null,
    replyClassification:clean(input.replyClassification??existing?.replyClassification,80),
    replySummary:clean(input.replySummary??existing?.replySummary,2000),
    nextAction:clean(input.nextAction??existing?.nextAction,240),
  };
}

export function createInMemoryOutreachStore({now=nowIso,id=()=>randomUUID()}={}){
  const records=new Map();
  const audit=[];
  const log=(action,item,actor)=>audit.unshift({id:id(),action,outreachId:item.id,actor:clean(actor,160),at:now()});
  return Object.freeze({
    async ensureSeed(items=[]){
      for(const input of items){
        const value=normalizeOutreach(input);
        const recordId=`outreach:${value.prospectId}`;
        if(!records.has(recordId)) records.set(recordId,{id:recordId,...value,createdAt:now(),updatedAt:now(),revision:1});
      }
    },
    async list({status}={}){return [...records.values()].filter(x=>!status||x.status===status).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(structuredClone);},
    async get(recordId){const value=records.get(recordId);return value?structuredClone(value):null;},
    async create(input,actor='NIA-013 DEALDESK'){const value={id:id(),...normalizeOutreach(input),createdAt:now(),updatedAt:now(),revision:1};records.set(value.id,value);log('created',value,actor);return structuredClone(value);},
    async update(recordId,input,actor='NIA-013 DEALDESK'){
      const current=records.get(recordId); if(!current) throw new Error('outreach_not_found');
      const value={...current,...normalizeOutreach(input,current),updatedAt:now(),revision:(current.revision||0)+1};
      records.set(recordId,value);log('updated',value,actor);return structuredClone(value);
    },
    async audit({limit=50}={}){return structuredClone(audit.slice(0,Math.min(Number(limit)||50,200)));}
  });
}

export function createFirestoreOutreachStore({db,now=nowIso,id=()=>randomUUID()}={}){
  if(!db?.collection) throw new Error('firestore_db_required');
  const records=db.collection('neoDealDeskOutreach');
  const audits=db.collection('neoDealDeskOutreachAudit');
  const auditValue=(action,item,actor)=>({id:id(),action,outreachId:item.id,actor:clean(actor,160),at:now()});
  return Object.freeze({
    async ensureSeed(items=[]){
      for(const input of items){
        const value=normalizeOutreach(input),recordId=`outreach:${value.prospectId}`,ref=records.doc(recordId),snap=await ref.get();
        if(!snap.exists) await ref.create({id:recordId,...value,createdAt:now(),updatedAt:now(),revision:1});
      }
    },
    async list({status}={}){
      const snap=await records.orderBy('updatedAt','desc').limit(250).get();
      return snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>!status||x.status===status);
    },
    async get(recordId){const snap=await records.doc(recordId).get();return snap.exists?{id:snap.id,...snap.data()}:null;},
    async create(input,actor='NIA-013 DEALDESK'){
      const recordId=id(),value={id:recordId,...normalizeOutreach(input),createdAt:now(),updatedAt:now(),revision:1},audit=auditValue('created',value,actor),batch=db.batch();
      batch.create(records.doc(recordId),value);batch.create(audits.doc(audit.id),audit);await batch.commit();return value;
    },
    async update(recordId,input,actor='NIA-013 DEALDESK'){
      const ref=records.doc(recordId);let saved;
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref);if(!snap.exists)throw new Error('outreach_not_found');
        const current={id:snap.id,...snap.data()},value={...current,...normalizeOutreach(input,current),updatedAt:now(),revision:(current.revision||0)+1},audit=auditValue('updated',value,actor);
        tx.set(ref,value,{merge:false});tx.create(audits.doc(audit.id),audit);saved=value;
      });
      return saved;
    },
    async audit({limit=50}={}){const snap=await audits.orderBy('at','desc').limit(Math.min(Number(limit)||50,200)).get();return snap.docs.map(d=>({id:d.id,...d.data()}));}
  });
}
