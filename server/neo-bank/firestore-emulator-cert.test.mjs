// NEOB-021: opt-in Firestore emulator certification.
// Run: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node --test server/neo-bank/firestore-emulator-cert.test.mjs
// No production Firebase credentials are used. Skip when emulator unavailable.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createNeoBankFirestoreStore} from './firestore-store.mjs';
const require=createRequire(import.meta.url);
const host=process.env.FIRESTORE_EMULATOR_HOST;
let firebaseApp=null,firestoreApi=null;
if(host){try{firebaseApp=require('firebase-admin/app');firestoreApi=require('firebase-admin/firestore')}catch{}}
if(host&&(!firebaseApp||!firestoreApi))throw new Error('firebase_admin_required_for_emulator_certification');
const enabled=Boolean(host&&firebaseApp&&firestoreApi);
const hash=x=>createHash('sha256').update(x).digest('hex');
test('CES atomic posting, replay and insufficient-credit rollback on Firestore emulator',{skip:!enabled},async()=>{
 const app=firebaseApp.initializeApp({projectId:'demo-neob022'},'neob021-cert-'+process.pid);
 const db=firestoreApi.getFirestore(app);
 const seed=async(coll,id,data)=>db.collection(coll).doc(id).set(data);
 const sender='neob021-sender-'+process.pid,receiver='neob021-receiver-'+process.pid;
 const senderKey=hash(sender),receiverKey=hash(receiver);
 const fromNumber='CES-'+senderKey.slice(0,10).toUpperCase(),toNumber='CES-'+receiverKey.slice(0,10).toUpperCase();
 const now=new Date().toISOString();
 const base={balance:0,creditLimit:50,status:'active',role:'member',createdAt:now,updatedAt:now};
 try{
  await seed('neoBankCesAccounts',senderKey,{...base,subject:sender,accountNumber:fromNumber});
  await seed('neoBankCesAccounts',receiverKey,{...base,subject:receiver,accountNumber:toNumber});
  const store=createNeoBankFirestoreStore({db});
  const key='neob021-once-'+process.pid,approval='neob021-approval-'+process.pid,digest='a'.repeat(64);
  const permit=async(id,d,expiry=Date.now()+120000)=>seed('neoBankWalletApprovals',hash(id),{subject:sender,digest:d,operation:'ces.transfer',expiresAtMs:expiry,state:'pending'});
  await permit(approval,digest);
  const challenge='neob029-challenge-'+String(process.pid).padEnd(40,'q'),credentialId='neob029-credential-'+process.pid;
  await seed('neoBankWalletChallenges',hash(challenge),{subject:sender,digest,operation:'ces.transfer',approvalId:approval,challenge,expiresAtMs:Date.now()+120000,status:'pending'});
  await seed('neoMaskCredentials',hash(credentialId),{subject:sender,status:'active',rpId:'connect.holytemples.org',counter:5});
  const walletProof={verified:true,subject:sender,digest,approvalId:approval,challenge,credentialId,expectedCounter:5,newCounter:6};
  const input={toAccount:toNumber,amount:10,memo:'synthetic test',idempotencyKey:key};
  const attempts=await Promise.allSettled([store.transfer(sender,input,{approvalId:approval,digest,walletProof}),store.transfer(sender,input,{approvalId:approval,digest,walletProof})]);
  assert(attempts.some(v=>v.status==='fulfilled'));
  const acctA=(await db.collection('neoBankCesAccounts').doc(senderKey).get()).data();
  const acctB=(await db.collection('neoBankCesAccounts').doc(receiverKey).get()).data();
  assert.equal(acctA.balance,-10);assert.equal(acctB.balance,10);
  const consumed=(await db.collection('neoBankWalletApprovals').doc(hash(approval)).get()).data();
  assert.equal(consumed.state,'consumed');
  assert.equal((await db.collection('neoBankWalletChallenges').doc(hash(challenge)).get()).data().status,'consumed');
  assert.equal((await db.collection('neoMaskCredentials').doc(hash(credentialId)).get()).data().counter,6);
  await assert.rejects(store.transfer(sender,{...input,idempotencyKey:key+'x',amount:999},{approvalId:approval,digest,walletProof}),/wallet_approval_rejected|insufficient_credit/);
  const after=(await db.collection('neoBankCesAccounts').doc(senderKey).get()).data();
  assert.equal(after.balance,-10);
  const other='neob021-approval-other-'+process.pid,otherKey='neob021-other-key-'+process.pid,otherDigest='b'.repeat(64);
  await permit(other,otherDigest);
  const challenge2='neob029-other-challenge-'+String(process.pid).padEnd(40,'q'),credential2='neob029-other-credential-'+process.pid;
  await seed('neoBankWalletChallenges',hash(challenge2),{subject:sender,digest:otherDigest,operation:'ces.transfer',approvalId:other,challenge:challenge2,expiresAtMs:Date.now()+120000,status:'pending'});
  await seed('neoMaskCredentials',hash(credential2),{subject:sender,status:'active',rpId:'connect.holytemples.org',counter:9});
  const otherProof={verified:true,subject:sender,digest:otherDigest,approvalId:other,challenge:challenge2,credentialId:credential2,expectedCounter:9,newCounter:10};
  await assert.rejects(store.transfer(sender,{...input,idempotencyKey:otherKey,amount:100},{approvalId:other,digest:otherDigest,walletProof:otherProof}),/insufficient_credit/);
  assert.equal((await db.collection('neoBankWalletApprovals').doc(hash(other)).get()).data().state,'pending');
  assert.equal((await db.collection('neoBankWalletChallenges').doc(hash(challenge2)).get()).data().status,'pending');
  assert.equal((await db.collection('neoMaskCredentials').doc(hash(credential2)).get()).data().counter,9);
  await assert.rejects(store.transfer(sender,{...input,idempotencyKey:'no-proof-'+process.pid},{approvalId:approval,digest}),/wallet_authentication_required/);
  // NEOB-025: the same approval must not authorize a different idempotency
  // key after successful settlement, even when the client changes fields.
  const reusedKey='neob025-replay-'+process.pid;
  await assert.rejects(
    store.transfer(sender,{...input,idempotencyKey:reusedKey},{approvalId:approval,digest,walletProof}),
    /wallet_approval_rejected/
  );
  assert.equal((await db.collection('neoBankCesAccounts').doc(senderKey).get()).data().balance,-10);
  assert.equal((await db.collection('neoBankCesAccounts').doc(receiverKey).get()).data().balance,10);
  // A failed balance check must not consume or journal the new approval.
  assert.equal((await db.collection('neoBankWalletApprovals').doc(hash(other)).get()).data().state,'pending');
 } finally {await app.delete();}
});
