import test from 'node:test'
import assert from 'node:assert/strict'
import {createCareerTask,createAwardProposal,NEO_CAREERS_AUTHORITY} from './contracts.mjs'
const base={id:'TASK-1',title:'Review Bitcoin data',description:'Validate independent source evidence',employerId:'NEO',compensation:{asset:'NOMNI',units:'25.00000000',fiatReference:'USD equivalent specified in signed engagement terms'}}
test('task draft has no release capability',()=>{const a=createCareerTask(base);assert.equal(a.status,'draft');assert.equal(a.compensation.release,'disabled')})
test('positive compensation enforced',()=>assert.throws(()=>createCareerTask({...base,compensation:{...base.compensation,units:'-1'}})))
test('unverified currency cannot be self-certified by caller',()=>assert.throws(()=>createCareerTask({...base,compensation:{...base.compensation,assetVerified:true}})))
test('task cannot lack fiat/reference wage terms',()=>assert.throws(()=>createCareerTask({...base,compensation:{asset:'NOMNI',units:'2'}})))
test('award requires independent reviewer',()=>assert.throws(()=>createAwardProposal({taskId:'T',contributorId:'X',reviewerId:'X',qualityScore:95,asset:'NOMNI',units:'1'})))
test('equity award requires separate published terms',()=>assert.throws(()=>createAwardProposal({taskId:'T',contributorId:'X',reviewerId:'Y',qualityScore:95,asset:'STANSHARES',units:'1',awardType:'equity-grant'})))
test('awards remain unapproved and nontransferable',()=>{const a=createAwardProposal({taskId:'T',contributorId:'X',reviewerId:'Y',qualityScore:95,asset:'NEOCASH',units:'1'});assert.equal(a.transferEnabled,false);assert.equal(a.approved,false)})
test('World Currency and equity registries separated',()=>assert.notEqual(NEO_CAREERS_AUTHORITY.currencyRegistryAddress,NEO_CAREERS_AUTHORITY.equityRegistryAddress))
