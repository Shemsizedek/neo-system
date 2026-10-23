import test from 'node:test'
import assert from 'node:assert/strict'
import {projectCareersDashboard} from './dashboard-projection.mjs'
const claims={sub:'worker1',iss:'https://identity.example',aud:'neo-careers',exp:Math.floor(Date.now()/1000)+3600,roles:['contributor'],employerId:'company1'}
const records=[{id:'1',contributorId:'worker1',employerId:'company1',title:'Review source',asset:'NOMNI',units:'10'},{id:'2',contributorId:'worker2',employerId:'company2',title:'Private task'}]
test('unknown session reveals no records',()=>assert.deepEqual(projectCareersDashboard({claims,view:'worker',ownerId:'worker1',records}).records,[]))
test('worker sees only own records',()=>{const x=projectCareersDashboard({claims,trustedVerification:true,view:'worker',ownerId:'worker1',records});assert.equal(x.records.length,1);assert.equal(x.walletSigningEnabled,false)})
test('wrong owner denied',()=>assert.equal(projectCareersDashboard({claims,trustedVerification:true,view:'worker',ownerId:'worker2',records}).ok,false))
test('employer cannot see competing tenant',()=>{const x=projectCareersDashboard({claims:{...claims,roles:['employer']},trustedVerification:true,view:'employer',ownerId:'company1',records});assert.equal(x.records.length,1)})
test('unsupported view denied',()=>assert.equal(projectCareersDashboard({claims,trustedVerification:true,view:'admin',ownerId:'worker1',records}).ok,false))
