import { randomUUID } from 'node:crypto';
import { CrmStoreError, normalizeCrmRecord } from './crm-store.mjs';

export function createFirestoreCrmStore({ db, now = () => new Date().toISOString(), id = () => randomUUID() } = {}) {
  if (!db?.collection) throw new Error('firestore_db_required');
  const records = db.collection('neoCrmRecords');
  const audits = db.collection('neoCrmAudit');
  function auditEntry(action, record, actor) { const auditId=id(); return { ref:audits.doc(auditId), value:{id:auditId,action,recordId:record.id,recordType:record.type,actor,at:now()} }; }
  return {
    async ensureSeed(items = []) { for (const input of items) { const normalized=normalizeCrmRecord(input), recordId=`${normalized.type}:${normalized.slug}`, ref=records.doc(recordId), doc=await ref.get(); if(!doc.exists) await ref.create({id:recordId,...normalized,createdAt:now(),updatedAt:now(),revision:1,archivedAt:null}); } },
    async list({ type, includeArchived = false } = {}) { let query = records.orderBy('updatedAt', 'desc').limit(250); const snap = await query.get(); return snap.docs.map(doc => ({ id:doc.id, ...doc.data() })).filter(item => (!type || item.type === type) && (includeArchived || !item.archivedAt)); },
    async get(recordId) { const doc = await records.doc(recordId).get(); return doc.exists ? { id:doc.id, ...doc.data() } : null; },
    async create(input, actor) { const recordId=id(), value={ id:recordId, ...normalizeCrmRecord(input), createdAt:now(), updatedAt:now(), revision:1, archivedAt:null }, audit=auditEntry('created',value,actor), batch=db.batch(); batch.create(records.doc(recordId),value); batch.create(audit.ref,audit.value); await batch.commit(); return value; },
    async update(recordId, input, actor) { const ref=records.doc(recordId); let saved; await db.runTransaction(async transaction => { const doc=await transaction.get(ref); if(!doc.exists||doc.data().archivedAt) throw new CrmStoreError('record_not_found',404); const current={id:doc.id,...doc.data()}, value={...current,...normalizeCrmRecord(input,current),updatedAt:now(),revision:(current.revision||0)+1}, audit=auditEntry('updated',value,actor); transaction.set(ref,value,{merge:false}); transaction.create(audit.ref,audit.value); saved=value; }); return saved; },
    async archive(recordId, actor) { const ref=records.doc(recordId); let saved; await db.runTransaction(async transaction => { const doc=await transaction.get(ref); if(!doc.exists) throw new CrmStoreError('record_not_found',404); const current={id:doc.id,...doc.data()}, value={...current,archivedAt:now(),updatedAt:now(),revision:(current.revision||0)+1}, audit=auditEntry('archived',value,actor); transaction.set(ref,value,{merge:false}); transaction.create(audit.ref,audit.value); saved=value; }); return saved; },
    async audit({ limit = 30 } = {}) { const snap=await audits.orderBy('at','desc').limit(Math.min(Number(limit)||30,100)).get(); return snap.docs.map(doc=>({id:doc.id,...doc.data()})); },
  };
}
