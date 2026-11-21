'use strict';
// NEO eFax workflow core: metadata only. No fax transport or document storage.
const crypto = require('node:crypto');
const STATES = Object.freeze(['SUBMITTED','REVIEW_PENDING','APPROVED','REJECTED']);
const ALLOWED = Object.freeze({SUBMITTED:['REVIEW_PENDING'],REVIEW_PENDING:['APPROVED','REJECTED'],APPROVED:[],REJECTED:[]});
function requireActor(actor) {
  if (!actor || typeof actor.id !== 'string' || !actor.id.trim() || !['requester','reviewer','admin'].includes(actor.role)) throw new Error('unauthorized_actor');
}
function createWorkflow({store, clock=()=>new Date().toISOString(), id=()=>crypto.randomUUID()}) {
  if (!store || !['get','insert','update','appendAudit'].every(k=>typeof store[k]==='function')) throw new Error('persistent_store_required');
  async function submit(actor, metadata, key) {
    requireActor(actor);
    if (typeof key!=='string' || !/^[a-zA-Z0-9_-]{12,128}$/.test(key)) throw new Error('invalid_idempotency_key');
    if (!metadata || typeof metadata.purpose!=='string' || metadata.purpose.length<1 || metadata.purpose.length>200 || Object.keys(metadata).some(k=>k!=='purpose')) throw new Error('invalid_metadata');
    // Store must atomically enforce unique (actor.id, key); no attachments, phone numbers, or taxpayer identifiers.
    const record={id:id(),ownerId:actor.id,purpose:metadata.purpose,status:'SUBMITTED',idempotencyKey:key,createdAt:clock(),version:1};
    const saved=await store.insert(record);
    if (!saved || !saved.id) throw new Error('store_insert_failed');
    if (saved.id===record.id) await store.appendAudit({requestId:saved.id,actorId:actor.id,action:'SUBMITTED',at:clock()});
    return saved;
  }
  async function transition(actor, requestId, next, expectedVersion) {
    requireActor(actor);
    if (!STATES.includes(next)) throw new Error('invalid_status');
    const record=await store.get(requestId);
    if (!record) throw new Error('not_found');
    if (!Number.isSafeInteger(expectedVersion) || record.version!==expectedVersion) throw new Error('version_conflict');
    if (!ALLOWED[record.status]?.includes(next)) throw new Error('invalid_transition');
    if (next==='REVIEW_PENDING' && !(actor.role==='reviewer'||actor.role==='admin')) throw new Error('forbidden');
    if (['APPROVED','REJECTED'].includes(next) && !(actor.role==='reviewer'||actor.role==='admin') ) throw new Error('forbidden');
    if (record.ownerId===actor.id) throw new Error('self_review_forbidden');
    const updated=await store.update(requestId,{status:next,version:expectedVersion+1},expectedVersion);
    if (!updated) throw new Error('version_conflict');
    await store.appendAudit({requestId,actorId:actor.id,action:next,at:clock()});
    return updated;
  }
  return {submit,transition};
}
module.exports={createWorkflow,STATES};
