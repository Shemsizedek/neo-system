import test from 'node:test'
import assert from 'node:assert/strict'
import { createCareersRegistry } from './marketplace.mjs'
const job={id:'T-01',title:'Label Bitcoin transaction evidence',description:'Independent evidence review',employerId:'NEO',compensation:{asset:'NOMNI',units:'10',fiatReference:'USD-equivalent terms must be agreed separately'}}
test('draft work is not publicly published',()=>{const m=createCareersRegistry();assert.equal(m.postDraft(job).status,'draft');assert.equal(m.capabilities().publicJobsEnabled,false)})
test('duplicate listings are rejected',()=>{const m=createCareersRegistry();m.postDraft(job);assert.throws(()=>m.postDraft(job),/duplicate/)})
test('applications require real drafts',()=>assert.throws(()=>createCareersRegistry().apply({taskId:'NOT_FOUND',contributorId:'worker1'})))
test('application does not authorize work or employment',()=>{const m=createCareersRegistry();m.postDraft(job);assert.equal(m.apply({taskId:'T-01',contributorId:'worker1'}).workAuthorized,false)})
test('award requires application and independent reviewer',()=>{const m=createCareersRegistry();m.postDraft(job);assert.throws(()=>m.proposeAward({taskId:'T-01',contributorId:'worker1',reviewerId:'reviewer1',qualityScore:95,asset:'NOMNI',units:'3'}));m.apply({taskId:'T-01',contributorId:'worker1'});const a=m.proposeAward({taskId:'T-01',contributorId:'worker1',reviewerId:'reviewer1',qualityScore:95,asset:'NOMNI',units:'3'});assert.equal(a.transferEnabled,false)})
test('no live payout or permanent ledger is advertised',()=>{const c=createCareersRegistry().capabilities();assert.equal(c.transfersEnabled,false);assert.equal(c.ledgerPersistence,false)})
