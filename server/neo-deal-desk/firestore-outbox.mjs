import { randomUUID } from 'node:crypto';
import { DealDeskOutboundError } from './outbound.mjs';

const clean=(v,max=1000)=>String(v??'').trim().slice(0,max);
const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(v,320));
const validPublicUrl=v=>{try{const u=new URL(v);return ['http:','https:'].includes(u.protocol)}catch{return false}};

export function createFirestoreDealDeskOutbox({db,now=()=>new Date().toISOString(),id=()=>randomUUID()}={}){
  if(!db?.collection)throw new Error('firestore_db_required');
  const records=db.collection('neoDealDeskOutbox');
  const events=db.collection('neoDealDeskOutboxEvents');
  const eventValue=(type,item,actor,detail={})=>({id:id(),type,itemId:item.id,actor:clean(actor,120),at:now(),...detail});

  return Object.freeze({
    async ensureSeed(seed=[]){
      for(const input of seed){
        const key=input.id||`outbox:${input.prospectId}`;
        const ref=records.doc(key),snap=await ref.get();
        if(snap.exists)continue;
        await ref.create({...input,id:key,status:input.status||'draft_ready',recipientEmail:input.recipientEmail||null,recipientEmailSourceUrl:input.recipientEmailSourceUrl||null,recipientEmailVerifiedAt:input.recipientEmailVerifiedAt||null,approvedAt:null,approvedBy:null,sentAt:null,delivery:null,reply:null,createdAt:now(),updatedAt:now(),revision:1});
      }
    },

    async list(){
      const snap=await records.orderBy('updatedAt','desc').limit(250).get();
      return snap.docs.map(doc=>({id:doc.id,...doc.data()}));
    },

    async get(itemId){
      const snap=await records.doc(itemId).get();
      return snap.exists?{id:snap.id,...snap.data()}:null;
    },

    async setRecipientEmail(itemId,actor,{email,sourceUrl}={}){
      if(!validEmail(email))throw new DealDeskOutboundError('recipient_email_invalid',400);
      if(!validPublicUrl(sourceUrl))throw new DealDeskOutboundError('recipient_email_source_required',400);
      const ref=records.doc(itemId);let saved;
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref);if(!snap.exists)throw new DealDeskOutboundError('outbox_item_not_found',404);
        const current={id:snap.id,...snap.data()};
        if(['sent','replied'].includes(current.status))throw new DealDeskOutboundError('outbox_recipient_locked',409);
        const value={...current,recipientEmail:clean(email,320).toLowerCase(),recipientEmailSourceUrl:clean(sourceUrl,1000),recipientEmailVerifiedAt:now(),updatedAt:now(),revision:(current.revision||0)+1};
        const event=eventValue('recipient_verified',value,actor,{sourceUrl:value.recipientEmailSourceUrl});
        tx.set(ref,value,{merge:false});tx.create(events.doc(event.id),event);saved=value;
      });
      return saved;
    },

    async approve(itemId,actor,note=''){
      const ref=records.doc(itemId);let saved;
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref);if(!snap.exists)throw new DealDeskOutboundError('outbox_item_not_found',404);
        const current={id:snap.id,...snap.data()};
        if(current.status==='sent')throw new DealDeskOutboundError('outbox_item_already_sent',409);
        const value={...current,status:'approved_to_send',approvedAt:now(),approvedBy:clean(actor,120),approvalNote:clean(note,500),updatedAt:now(),revision:(current.revision||0)+1};
        const event=eventValue('approved',value,actor,{note:clean(note,500)});
        tx.set(ref,value,{merge:false});tx.create(events.doc(event.id),event);saved=value;
      });
      return saved;
    },

    async markSent(itemId,actor,delivery){
      const ref=records.doc(itemId);let saved;
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref);if(!snap.exists)throw new DealDeskOutboundError('outbox_item_not_found',404);
        const current={id:snap.id,...snap.data()};
        const value={...current,status:'sent',sentAt:now(),delivery:delivery||null,updatedAt:now(),revision:(current.revision||0)+1};
        const event=eventValue('sent',value,actor,{delivery:delivery||null});
        tx.set(ref,value,{merge:false});tx.create(events.doc(event.id),event);saved=value;
      });
      return saved;
    },

    async recordFailure(itemId,actor,error){
      const ref=records.doc(itemId);let saved;
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref);if(!snap.exists)throw new DealDeskOutboundError('outbox_item_not_found',404);
        const current={id:snap.id,...snap.data()},lastError=clean(error?.message||error,500);
        const value={...current,status:'send_failed',lastError,updatedAt:now(),revision:(current.revision||0)+1};
        const event=eventValue('send_failed',value,actor,{error:lastError});
        tx.set(ref,value,{merge:false});tx.create(events.doc(event.id),event);saved=value;
      });
      return saved;
    },

    async recordReply(itemId,actor,reply){
      const ref=records.doc(itemId);let saved;
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref);if(!snap.exists)throw new DealDeskOutboundError('outbox_item_not_found',404);
        const current={id:snap.id,...snap.data()};
        if(current.status!=='sent'&&current.status!=='replied')throw new DealDeskOutboundError('outbox_item_not_sent',409);
        const normalized={classification:clean(reply?.classification,80),summary:clean(reply?.summary,2000),receivedAt:reply?.receivedAt||now(),source:clean(reply?.source||'mail-provider',120)};
        const value={...current,status:'replied',reply:normalized,updatedAt:now(),revision:(current.revision||0)+1};
        const event=eventValue('replied',value,actor,{classification:normalized.classification});
        tx.set(ref,value,{merge:false});tx.create(events.doc(event.id),event);saved=value;
      });
      return saved;
    },

    async events(limit=50){
      const snap=await events.orderBy('at','desc').limit(Math.min(Number(limit)||50,200)).get();
      return snap.docs.map(doc=>({id:doc.id,...doc.data()}));
    }
  });
}
