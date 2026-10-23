import test from 'node:test';import assert from 'node:assert/strict';
import {requireOperator,createOperatorToken} from './operator-auth.mjs';
import {makeAuditEvent,appendEvidenceAudit,schema} from './audit.mjs';
const secret='x'.repeat(48),claims={iss:'neo-pass',aud:'neo-bmi',sub:'operator1',role:'bmi-reader',exp:2000000000};
test('operator must have valid signed scoped token',()=>{let token=createOperatorToken(claims,secret);assert.equal(requireOperator({headers:{authorization:'Bearer '+token}},{secret,clock:()=>0}).allowed,true);assert.equal(requireOperator({headers:{authorization:'Bearer '+token+'x'}},{secret}).allowed,false)});
test('reject expiry, wrong role, and wrong issuer',()=>{for(const change of [{exp:1},{role:'admin'},{iss:'other'}]){const token=createOperatorToken({...claims,...change},secret);assert.equal(requireOperator({headers:{authorization:'Bearer '+token}},{secret}).allowed,false)}});
test('audit entry deterministic with fixed timestamp and previous hash',()=>{const data={operatorId:'operator1',assetId:'TEST',txid:'a'.repeat(64),evidence:{status:'NOT_VERIFIED'},occurredAt:'2026-01-01T00:00:00.000Z'};assert.equal(makeAuditEvent(data).eventHash,makeAuditEvent(data).eventHash)});
test('audit append uses parameterized insert',async()=>{let invoked=false;await appendEvidenceAudit({query:async(sql,args)=>{assert.match(sql,/\$1/);assert.equal(args.length,9);invoked=true}},makeAuditEvent({operatorId:'operator1',assetId:'TEST',txid:'a'.repeat(64),evidence:{status:'NOT_VERIFIED'}}));assert.ok(invoked);assert.match(schema,/REVOKE UPDATE/)});
