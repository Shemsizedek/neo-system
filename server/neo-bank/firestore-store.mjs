import {createHash} from 'node:crypto';
import {validateVerifiedBinding,publicIdentityBinding} from './nmni-registry.mjs';
const clean=value=>String(value??'').trim();
const subjectKey=subject=>createHash('sha256').update(clean(subject)).digest('hex');
export function createNeoBankFirestoreStore({db,now=()=>new Date().toISOString()}={}){
  if(!db?.collection)throw new Error('firestore_db_required');
  const accounts=db.collection('neoBankCesAccounts'),offers=db.collection('neoBankCesOffers'),entries=db.collection('neoBankCesEntries'),idempotency=db.collection('neoBankCesIdempotency');
  const cases=db.collection('neoBankServiceCases'),evidence=db.collection('neoBankCrownEvidence'),nmniBindings=db.collection('neoBankNmniBindings');
  const accountRef=subject=>accounts.doc(subjectKey(subject));
  const publicAccount=value=>({accountNumber:value.accountNumber,displayName:value.displayName,role:value.role||'member',balance:Number(value.balance||0),creditLimit:Number(value.creditLimit||0),status:value.status||'active',createdAt:value.createdAt});
  return {
    async myNmniBinding(subject){
      const account=await this.accountBySubject(subject);if(!account)throw new Error('account_not_found');
      const snapshot=await nmniBindings.doc(account.id).get();
      return {internalAccountNumber:account.accountNumber,externalIdentity:snapshot.exists?publicIdentityBinding(snapshot.data()):null,cesIntegration:'AWAITING_AUTHORIZED_VERIFICATION'};
    },
    async bindNmniIdentity(subject,input,operator){
      // Approval gate: only a configured executive identity may call this store action.
      if(operator?.role!=='executive-admin')throw new Error('authorization_required');
      const account=await this.accountBySubject(subject);if(!account)throw new Error('account_not_found');
      const checked=validateVerifiedBinding(input),ref=nmniBindings.doc(account.id),uniqueRef=db.collection('neoBankNmniUnique').doc(checked.nmniAccountId);
      const timestamp=now();
      return db.runTransaction(async tx=>{
        const [existing,claim]=await Promise.all([tx.get(ref),tx.get(uniqueRef)]);
        if(claim.exists&&claim.data().accountId!==account.id)throw new Error('nmni_already_bound');
        if(existing.exists&&existing.data().nmniAccountId!==checked.nmniAccountId)throw new Error('nmni_rebind_forbidden');
        if(existing.exists)return publicIdentityBinding(existing.data());
        const record={...checked,accountId:account.id,verifiedAt:timestamp,verifiedBy:operator.subject};
        tx.create(ref,record);
        if(!claim.exists)tx.create(uniqueRef,{accountId:account.id,createdAt:timestamp});
        return publicIdentityBinding(record);
      });
    },
    async createSupportCase(subject,input){
      const account=await this.accountBySubject(subject);if(!account)throw new Error('account_not_found');
      const topic=clean(input.topic),details=clean(input.details);
      if(topic.length<3||topic.length>120||details.length<5||details.length>2000)throw new Error('invalid_support_case');
      const ref=cases.doc(),record={accountId:account.id,accountNumber:account.accountNumber,subjectKey:subjectKey(subject),topic,details,status:'open',createdAt:now(),updatedAt:now()};
      await ref.create(record);return{id:ref.id,topic,status:record.status,createdAt:record.createdAt};
    },
    async listSupportCases(subject){
      const snapshot=await cases.where('subjectKey','==',subjectKey(subject)).limit(50).get();
      return snapshot.docs.map(doc=>({id:doc.id,topic:doc.data().topic,status:doc.data().status,createdAt:doc.data().createdAt})).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    },
    async createEvidenceDigest(subject,input){
      const account=await this.accountBySubject(subject);if(!account)throw new Error('account_not_found');
      const kind=clean(input.kind),digest=clean(input.documentDigest),sourceEventId=clean(input.sourceEventId);
      if(!['AGREEMENT','TIME_EQUITY','VDOLLAR_LEDGER','SERVICE_NOTE'].includes(kind)||!/^sha256:[a-f0-9]{64}$/.test(digest)||sourceEventId.length<8||sourceEventId.length>100)throw new Error('invalid_evidence');
      // This journal stores digests only, never conversation plaintext or financial settlement assertions.
      const id=subjectKey(subject)+'_'+createHash('sha256').update(sourceEventId).digest('hex'),ref=evidence.doc(id);
      const record={subjectKey:subjectKey(subject),accountNumber:account.accountNumber,kind,documentDigest:digest,sourceEventId,status:'RECORDED',settlement:'NONE',createdAt:now()};
      try{await ref.create(record)}catch(error){if(error.code!==6)throw error;const prior=(await ref.get()).data();if(prior.documentDigest!==digest||prior.kind!==kind)throw new Error('evidence_conflict')}
      return{id,...record};
    },
    async customerActivity(subject){
      const account=await this.accountBySubject(subject);if(!account)throw new Error('account_not_found');
      const [journal,service,statement]=await Promise.all([
        evidence.where('subjectKey','==',subjectKey(subject)).limit(50).get(),
        cases.where('subjectKey','==',subjectKey(subject)).limit(50).get(),
        this.statements(subject,50)
      ]);
      const records=[
        ...journal.docs.map(doc=>({id:doc.id,category:'CROWN_EVIDENCE',source:'neo-bank-private-journal',state:'RECORDED',externalSettlementVerified:false,kind:doc.data().kind,createdAt:doc.data().createdAt})),
        ...service.docs.map(doc=>({id:doc.id,category:'CUSTOMER_SERVICE',source:'neo-bank-customer-relations',state:doc.data().status,externalSettlementVerified:false,kind:'SUPPORT_CASE',createdAt:doc.data().createdAt})),
        ...(statement?.entries||[]).map(entry=>({id:entry.id,category:'LOCAL_EXCHANGE',source:'neo-bank-internal-ledger',state:entry.status,externalSettlementVerified:false,kind:'TRANSFER',createdAt:entry.createdAt}))
      ];
      return {accountNumber:account.accountNumber,records:records.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,100),externalSources:{ces:'NOT_CONNECTED',bitcoin:'NOT_CONNECTED',counterparty:'NOT_CONNECTED'},teller:{integration:'PENDING'}};
    },
    async createTellerSupportHandoff(subject,input){
      const account=await this.accountBySubject(subject);if(!account)throw new Error('account_not_found');
      const sessionId=clean(input.sessionId),details=clean(input.details);
      if(!/^[A-Za-z0-9._:-]{8,100}$/.test(sessionId)||details.length<5||details.length>1000)throw new Error('invalid_teller_handoff');
      // Customer-submitted reference is unverified until trusted teller service attests it.
      const ref=cases.doc(),timestamp=now(),record={accountId:account.id,accountNumber:account.accountNumber,subjectKey:subjectKey(subject),topic:'NEO Teller assistance',details,tellerSessionReference:sessionId,tellerSessionVerified:false,status:'open',createdAt:timestamp,updatedAt:timestamp};
      await ref.create(record);return {id:ref.id,topic:record.topic,status:record.status,tellerSessionVerified:false,createdAt:timestamp};
    },
    async ping(){await db.collection('_neoBank').doc('health').get();return true},
    async ensureMember(identity){const ref=accountRef(identity.subject),snapshot=await ref.get();if(snapshot.exists){if(identity.role==='executive-admin'&&snapshot.data().role!=='executive-admin')await ref.update({role:'executive-admin',updatedAt:now()});return{id:ref.id,...(await ref.get()).data()}}const createdAt=now(),account={subject:identity.subject,accountNumber:`CES-${ref.id.slice(0,10).toUpperCase()}`,displayName:clean(identity.name)||'CES Member',email:clean(identity.email).toLowerCase(),role:identity.role||'member',balance:0,creditLimit:0,status:'active',createdAt,updatedAt:createdAt};try{await ref.create(account)}catch(error){if(error.code!==6)throw error}return{id:ref.id,...(await ref.get()).data()}},
    async accountBySubject(subject){const doc=await accountRef(subject).get();return doc.exists?{id:doc.id,...doc.data()}:null},
    async account(accountNumber){const key=clean(accountNumber);if(!/^[A-Za-z0-9._-]{2,80}$/.test(key))return null;const snap=await accounts.where('accountNumber','==',key).limit(1).get();return snap.empty?null:{id:snap.docs[0].id,...snap.docs[0].data()}},
    async directory(limit=100){const snap=await accounts.where('status','==','active').limit(Math.min(Number(limit)||100,100)).get();return snap.docs.map(doc=>publicAccount(doc.data()))},
    async updateAccount(accountNumber,input){const snap=await accounts.where('accountNumber','==',clean(accountNumber)).limit(1).get();if(snap.empty)throw new Error('account_not_found');const creditLimit=Number(input.creditLimit),status=input.status==='suspended'?'suspended':'active';if(!Number.isFinite(creditLimit)||creditLimit<0||creditLimit>100000000)throw new Error('invalid_account_update');await snap.docs[0].ref.update({creditLimit,status,updatedAt:now()});return publicAccount((await snap.docs[0].ref.get()).data())},
    async listOffers({kind,status='open',limit=100}={}){let query=offers.where('status','==',status);if(kind)query=query.where('kind','==',kind);const snap=await query.limit(Math.min(Number(limit)||100,100)).get();return snap.docs.map(doc=>({id:doc.id,...doc.data()})).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))},
    async createOffer(subject,input){const account=await this.accountBySubject(subject);if(!account)throw new Error('account_not_found');const kind=input.kind==='need'?'need':'offer',title=clean(input.title),description=clean(input.description),amount=Number(input.amount||0);if(title.length<3||title.length>120||description.length>1000||!Number.isFinite(amount)||amount<0)throw new Error('invalid_offer');const ref=offers.doc(),record={memberId:account.id,accountNumber:account.accountNumber,displayName:account.displayName,kind,title,description,amount,currency:'NOMNI',status:'open',createdAt:now(),updatedAt:now()};await ref.create(record);return{id:ref.id,...record}},
    async statements(subject,limit=100){const account=await this.accountBySubject(subject);if(!account)return null;const [sent,received]=await Promise.all([entries.where('fromAccount','==',account.accountNumber).limit(100).get(),entries.where('toAccount','==',account.accountNumber).limit(100).get()]);const seen=new Map();for(const doc of [...sent.docs,...received.docs])seen.set(doc.id,{id:doc.id,...doc.data()});return{account:publicAccount(account),entries:[...seen.values()].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,Math.min(Number(limit)||100,100))}},
    async transfer(subject,input){const toAccount=clean(input.toAccount),amount=Number(input.amount),memo=clean(input.memo),key=clean(input.idempotencyKey);if(!/^CES-[A-Z0-9]{10}$/.test(toAccount)||!Number.isFinite(amount)||amount<=0||amount>100000000||memo.length>240||key.length<8||key.length>100)throw new Error('invalid_transfer');const fromRef=accountRef(subject),toSnap=await accounts.where('accountNumber','==',toAccount).limit(1).get();if(toSnap.empty)throw new Error('recipient_not_found');const toRef=toSnap.docs[0].ref;if(fromRef.id===toRef.id)throw new Error('self_transfer');const idemRef=idempotency.doc(`${fromRef.id}_${createHash('sha256').update(key).digest('hex')}`);return db.runTransaction(async tx=>{const [idem,from,to]=await Promise.all([tx.get(idemRef),tx.get(fromRef),tx.get(toRef)]);if(idem.exists)return idem.data().result;if(!from.exists||!to.exists)throw new Error('account_not_found');const fromData=from.data(),toData=to.data(),next=Number(fromData.balance||0)-amount;if(next < -Number(fromData.creditLimit||0))throw new Error('insufficient_credit');const createdAt=now(),ref=entries.doc(),result={id:ref.id,fromAccount:fromData.accountNumber,toAccount:toData.accountNumber,amount,currency:'NOMNI',memo,status:'posted',createdAt};tx.update(fromRef,{balance:next,updatedAt:createdAt});tx.update(toRef,{balance:Number(toData.balance||0)+amount,updatedAt:createdAt});tx.create(ref,result);tx.create(idemRef,{result,createdAt});return result})}
  };
}
