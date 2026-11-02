import test from 'node:test'
import assert from 'node:assert/strict'
import { sha256 } from './evidence.mjs'
import { createPressCustodyStore } from './custody-store.mjs'
import { createLocalPressStaging } from './local-staging.mjs'
import { issueNeopassToken } from '../neo-platform-api/neopass-google-auth.mjs'
import { assessPressRuntimeCandidate } from './runtime-preflight.mjs'

const epoch=Date.parse('2026-11-02T20:00:00Z')
const now=()=>epoch
const secret='NEO-006-correction-test-only-secret-not-production'
const people={
  reporter:{roles:['press:reporter'],caseIds:['CASE-001']},
  openingEditor:{roles:['press:editor'],caseIds:['CASE-001']},
  approvingEditor:{roles:['press:editor'],caseIds:['CASE-001']},
  laterEditor:{roles:['press:editor'],caseIds:['CASE-001']},
  firstPrivacy:{roles:['press:privacy'],caseIds:['CASE-001']},
  laterPrivacy:{roles:['press:privacy'],caseIds:['CASE-001']},
  legal:{roles:['press:legal'],caseIds:['CASE-001']},
  outsider:{roles:['press:editor'],caseIds:['CASE-002']}
}
const authService={async session(subject){return people[subject] ? {subject,neopassStatus:'active'} : null}}
const accessRegistry={async resolveAccess(subject){return people[subject] ? {subject,status:'active',...people[subject]} : null}}
const token=subject=>issueNeopassToken({subject,secret,now,claims:{
  aud:'neo-press',scope:'press:case-access',token_use:'neopass-session'
}})
const headers=subject=>({authorization:'Bearer '+token(subject),'content-type':'application/json'})
const post=(origin,path,subject,body)=>fetch(origin+path,{
  method:'POST',headers:headers(subject),body:JSON.stringify(body)
})
const evidence=()=>({
  caseId:'CASE-001', title:'Test meeting record', sourceTier:'PRIMARY',
  editorialState:'CORROBORATED', accessLevel:'PUBLIC',sourceKind:'DOCUMENT',
  originalSha256:sha256('example original'),sourceLocatorSha256:sha256('fixture locator'),
  observedAt:new Date(epoch).toISOString()
})
const store=()=>createPressCustodyStore({dbPath:':memory:',testMemory:true,now:()=>new Date(epoch)})
const note='Reviewed correction against original source record.'

test('correction requires two different reviewers, separate from submitter and reporter',()=>{
  const s=store()
  try {
    const id=s.ingest(evidence(),'reporter').id
    s.review(id,'ACCURACY','APPROVE','approvingEditor')
    s.review(id,'PRIVACY','APPROVE','firstPrivacy')
    s.review(id,'LEGAL_RISK','APPROVE','legal')
    const before=s.lookup(id)
    const correction=s.submitCorrection(id,{category:'FACTUAL_ERROR',summary:'Incorrect timestamp in report.'},'openingEditor')
    assert.throws(()=>s.releaseCandidate(id),/unresolved_correction/)
    assert.throws(()=>s.decideCorrection(correction.id,{gate:'EDITOR',decision:'APPROVE',rationale:note},'openingEditor'),/independent_correction/)
    assert.throws(()=>s.decideCorrection(correction.id,{gate:'EDITOR',decision:'APPROVE',rationale:note},'reporter'),/independent_correction/)
    const result=s.decideCorrection(correction.id,{gate:'EDITOR',decision:'APPROVE',rationale:note},'approvingEditor')
    assert.equal(result.status,'OPEN')
    assert.throws(()=>s.decideCorrection(correction.id,{gate:'PRIVACY',decision:'APPROVE',rationale:note},'approvingEditor'),/distinct_correction/)
    assert.equal(s.decideCorrection(correction.id,{gate:'PRIVACY',decision:'APPROVE',rationale:note},'firstPrivacy').status,'RESOLVED')
    assert.throws(()=>s.releaseCandidate(id),/fresh_editorial_review/)
    assert.equal(s.listCaseEvidence('CASE-001').records[0].correctionHold,true)
    assert.deepEqual(s.lookup(id),before)
    assert.equal(s.verifyCase('CASE-001').valid,true)
    s.postCorrectionReview(id,{gate:'ACCURACY',decision:'APPROVE',rationale:note},'laterEditor')
    assert.throws(()=>s.postCorrectionReview(id,{gate:'PRIVACY',decision:'APPROVE',rationale:note},'laterEditor'),/distinct_post_correction/)
    s.postCorrectionReview(id,{gate:'PRIVACY',decision:'APPROVE',rationale:note},'laterPrivacy')
    assert.throws(()=>s.releaseCandidate(id),/fresh_editorial_review/)
    s.postCorrectionReview(id,{gate:'LEGAL_RISK',decision:'APPROVE',rationale:note},'legal')
    const candidate=s.releaseCandidate(id)
    assert.equal(candidate.publicationPerformed,false)
    assert.equal(s.listCaseEvidence('CASE-001').records[0].correctionHold,false)
    assert.equal(s.verifyCase('CASE-001').valid,true)
  }finally{s.close()}
})
test('rejected correction cannot close or bypass hold',()=>{
  const s=store()
  try {
    const id=s.ingest(evidence(),'reporter').id
    const c=s.submitCorrection(id,{category:'REDACTION_REQUEST',summary:'Sensitive details need removal.'},'openingEditor')
    assert.equal(s.decideCorrection(c.id,{gate:'EDITOR',decision:'REJECT',rationale:note},'approvingEditor').status,'OPEN')
    assert.equal(s.decideCorrection(c.id,{gate:'PRIVACY',decision:'APPROVE',rationale:note},'firstPrivacy').status,'OPEN')
    assert.throws(()=>s.decideCorrection(c.id,{gate:'PRIVACY',decision:'APPROVE',rationale:note},'laterPrivacy'))
    assert.throws(()=>s.postCorrectionReview(id,{gate:'ACCURACY',decision:'APPROVE',rationale:note},'laterEditor'),/unresolved_correction/)
    assert.equal(s.listCorrections(id)[0].status,'OPEN')
  }finally{s.close()}
})
test('authenticated endpoints reject role forgery, wrong case and correction self-review',async()=>{
  const s=store()
  const harness=createLocalPressStaging({allowLocalTest:true,mode:'EPHEMERAL_TEST_ONLY',
    store:s,authService,accessRegistry,jwtSecret:secret,now})
  try {
    const {origin,host}=await harness.start()
    assert.equal(host,'127.0.0.1')
    const id=s.ingest(evidence(),'reporter').id
    const c=s.submitCorrection(id,{category:'SOURCE_DISPUTE',summary:'Original attribution requires review.'},'openingEditor')
    const path='/api/v1/press/corrections/'+c.id+'/decision'
    const payload={gate:'EDITOR',decision:'APPROVE',rationale:note}
    assert.equal((await post(origin,path,'openingEditor',payload)).status,409)
    assert.equal((await post(origin,path,'outsider',payload)).status,403)
    assert.equal((await post(origin,path,'reporter',payload)).status,403)
    const one=await post(origin,path,'approvingEditor',payload)
    assert.equal(one.status,200)
    assert.equal((await one.json()).decision.status,'OPEN')
    assert.equal((await post(origin,path,'firstPrivacy',{...payload,gate:'PRIVACY'})).status,200)
    const recheck='/api/v1/press/evidence/'+id+'/post-correction-review'
    assert.equal((await post(origin,recheck,'reporter',{gate:'ACCURACY',decision:'APPROVE',rationale:note})).status,403)
    assert.equal((await post(origin,recheck,'outsider',{gate:'ACCURACY',decision:'APPROVE',rationale:note})).status,403)
    assert.equal((await post(origin,recheck,'laterEditor',{gate:'ACCURACY',decision:'APPROVE',rationale:note})).status,200)
    assert.equal((await post(origin,recheck,'laterPrivacy',{gate:'PRIVACY',decision:'APPROVE',rationale:note})).status,200)
    assert.equal((await post(origin,recheck,'legal',{gate:'LEGAL_RISK',decision:'APPROVE',rationale:note})).status,200)
    assert.equal(s.correctionLookup(c.id).status,'RESOLVED')
  } finally {await harness.stop();s.close()}
})
test('production candidate assessment remains blocked with missing live external inspection',()=>{
  const report=assessPressRuntimeCandidate({deploymentSha:'a'.repeat(64)})
  assert.equal(report.status,'BLOCKED')
  assert.equal(report.productionAuthorized,false)
  assert.equal(report.productionDeployed,false)
  assert.equal(report.originalCredentialVerified,false)
  assert.ok(report.missingRuntimeEvidence.includes('issuer'))
  assert.ok(report.pressControls.missingControls.includes('LEGACY_VAULT_ISOLATION'))
})
