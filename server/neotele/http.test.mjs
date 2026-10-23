import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeoTeleHttpHandlers} from './http.mjs';
const subject='chaplain-001',saved=[];
const api=createNeoTeleHttpHandlers({
 resolveSession:async token=>({verified:token==='valid',subject}),
 loadChaplaincyMembership:async()=>({verified:true,subject,cohort:'chaplaincy',status:'ACTIVE'}),
 loadGuardianDevice:async()=>({verified:true,subject,deviceRef:'device-1',esimSupported:true,unlocked:true}),
 saveRequest:async({request})=>(saved.push(request),request),audit:async()=>{},
 listServices:async()=>saved,listDevices:async()=>[{subject,deviceRef:'device-1',verified:true,esimSupported:true,unlocked:true}],
 listProviders:async()=>[{id:'sandbox',name:'Sandbox only',authorized:false,verified:false},{id:'carrier-a',name:'Verified Provider',authorized:true,verified:true,offersEsim:true,coverageVerified:false}],
 recordConsent:async()=>{}
});
test('deny anonymous provider listing',async()=>assert.equal((await api({method:'GET',path:'/neotele/v1/providers'})).status,401));
test('directory excludes unverified provider',async()=>{
 const r=await api({method:'GET',path:'/neotele/v1/providers',sessionToken:'valid'});
 assert.equal(r.status,200);assert.equal(r.body.providers.length,1);
 assert.equal(r.body.providers[0].coverageVerified,false);
});
test('mutating request requires origin and explicit consent',async()=>{
 const args={method:'POST',path:'/neotele/v1/enroll',sessionToken:'valid',body:{deviceRef:'device-1',idempotencyKey:'unique',consentVersion:'v1',consentAccepted:true}};
 assert.equal((await api(args)).status,403);
 assert.equal((await api({...args,originVerified:true,body:{deviceRef:'device-1'}})).status,400);
 assert.equal((await api({...args,originVerified:true})).status,202);
 const view=await api({method:'GET',path:'/neotele/v1/portal',sessionToken:'valid'});
 assert.equal(view.body.services[0].state,'REQUESTED');
 assert.equal(view.body.activationEnabled,false);
});
