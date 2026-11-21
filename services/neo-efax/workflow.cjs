'use strict';
// Metadata-only eFax workflow. No document or fax operations.
const crypto=require('node:crypto');
const STATES=Object.freeze(['SUBMITTED','REVIEW_PENDING','APPROVED','REJECTED']);
const ALLOWED=Object.freeze({SUBMITTED:['REVIEW_PENDING'],REVIEW_PENDING:['APPROVED','REJECTED'],APPROVED:[],REJECTED:[]});
function requireActor(actor){
 if(!actor||typeof actor.id!=='string'||!actor.id.trim()||
 typeof actor.tenantId!=='string'||!actor.tenantId.trim()||
 !['requester','reviewer','admin'].includes(actor.role))throw new Error('unauthorized_actor');
}
function createWorkflow({store,clock=()=>new Date().toISOString(),id=()=>crypto.randomUUID()}){
 if(!store||typeof store.transaction!=='function')throw new Error('transactional_store_required');
 async function submit(actor,metadata,key){
  requireActor(actor);
  if(typeof key!=='string'||!/^[a-zA-Z0-9_-]{12,128}$/.test(key))throw new Error('invalid_idempotency_key');
  if(!metadata||typeof metadata.purpose!=='string'||!metadata.purpose.trim()||
  metadata.purpose.length>200||Object.keys(metadata).some(k=>k!=='purpose'))throw new Error('invalid_metadata');
  const record={id:id(),tenantId:actor.tenantId,ownerId:actor.id,purpose:metadata.purpose,
    status:'SUBMITTED',idempotencyKey:key,createdAt:clock(),version:1};
  return store.transaction(async tx=>{
   const saved=await tx.insert(record);
   if(!saved||!saved.id)throw new Error('store_insert_failed');
   if(saved.id===record.id)await tx.appendAudit({tenantId:actor.tenantId,requestId:saved.id,
    actorId:actor.id,action:'SUBMITTED',at:clock()});
   return saved;
  });
 }
 async function transition(actor,requestId,next,expectedVersion){
  requireActor(actor);
  if(!STATES.includes(next))throw new Error('invalid_status');
  if(!Number.isSafeInteger(expectedVersion)||expectedVersion<1)throw new Error('invalid_version');
  if(!['reviewer','admin'].includes(actor.role))throw new Error('forbidden');
  return store.transaction(async tx=>{
   const record=await tx.get(actor.tenantId,requestId);
   if(!record)throw new Error('not_found');
   if(record.ownerId===actor.id)throw new Error('self_review_forbidden');
   if(record.version!==expectedVersion)throw new Error('version_conflict');
   if(!ALLOWED[record.status]?.includes(next))throw new Error('invalid_transition');
   const updated=await tx.update(actor.tenantId,requestId,{status:next,version:expectedVersion+1},expectedVersion);
   if(!updated)throw new Error('version_conflict');
   await tx.appendAudit({tenantId:actor.tenantId,requestId,actorId:actor.id,action:next,at:clock()});
   return updated;
  });
 }
 return {submit,transition};
}
module.exports={createWorkflow,STATES};
