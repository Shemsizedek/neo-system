import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizePrincipal,guardedRiskProjection} from './access.mjs';
const p={subject:'test-reader',authenticated:true,roles:['treasury_reader'],scopes:['actuary:read'],expiresAt:Date.now()+3600000};
test('deny unauthenticated principals and expired identity',()=>{
 assert.throws(()=>authorizePrincipal({...p,authenticated:false},'actuary:read'),/Authenticated/);
 assert.throws(()=>authorizePrincipal({...p,expiresAt:0},'actuary:read'),/Expired/);
 assert.throws(()=>authorizePrincipal({...p,scopes:[]},'actuary:read'),/Scope/);
});
test('authorized reader receives redacted dashboard projection',()=>{
 const output=guardedRiskProjection({principal:p,envelopes:[{source:'CES_EXPORT',batchId:'example',asOf:'2026-10-29',readOnly:true,authorizedExport:true,records:[{id:'credit-1',type:'COMMUNITY_CREDIT',amountMinor:'100',unit:'VUSD',sourceId:'demo'}],journal:[]}]});
 assert.equal(output.classifications.length,0);
 assert.equal(output.sourceCount,1);
 assert.equal(output.mode,'READ_ONLY_DRAFT');
});
