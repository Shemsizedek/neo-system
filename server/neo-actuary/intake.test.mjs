import test from 'node:test';
import assert from 'node:assert/strict';
import {intakeEnvelope,buildRiskSnapshot} from './intake.mjs';
const base={source:'CES_EXPORT',batchId:'batch1',asOf:'2026-10-29',readOnly:true,authorizedExport:true,records:[{id:'r1',type:'COMMUNITY_CREDIT',amountMinor:'100',unit:'VUSD',sourceId:'source1'}],journal:[]};
test('documentary credits remain excluded',()=>{const r=buildRiskSnapshot([base]);assert.equal(r.eligibleBalances.length,0);assert.equal(r.unverifiedRecordCount,1);assert.equal(r.security.authenticated,false)});
test('deterministic digest and duplicate ID control',()=>{assert.equal(intakeEnvelope(base).digestSha256,intakeEnvelope(base).digestSha256);assert.throws(()=>intakeEnvelope({...base,records:[base.records[0],base.records[0]]}),/Duplicate/)});
test('reject unauthorized and replayed batches',()=>{assert.throws(()=>intakeEnvelope({...base,authorizedExport:false}),/authorized/);assert.throws(()=>buildRiskSnapshot([base,base]),/Duplicate batch/)});
