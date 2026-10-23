import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeoTeleOperatorHttp} from './operator-http.mjs';
const make=(authorized=true)=>createNeoTeleOperatorHttp({authenticate:async()=>({verified:true,subject:'a',operatorAuthorized:authorized}),
 summary:async()=>({liveCarrierActivation:false}),approve:async()=>({status:'APPROVED',activationEnabled:false})});
test('operator access requires trusted authorization',async()=>{
 assert.equal((await make(false)({method:'GET',path:'/neotele/v1/operator'})).status,403);
 assert.equal((await make()({method:'GET',path:'/neotele/v1/operator'})).body.liveCarrierActivation,false);
});
test('mutation requires trusted origin verification',async()=>{
 const req={method:'POST',path:'/neotele/v1/operator/evidence/review',body:{reference:'e1',decision:'APPROVED'}};
 assert.equal((await make()(req)).status,403);
 assert.equal((await make()({...req,originVerified:true})).body.activationEnabled,false);
});
