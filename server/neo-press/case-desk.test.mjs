import test from 'node:test'
import assert from 'node:assert/strict'
import { createPressCustodyStore } from './custody-store.mjs'
import { createLocalPressStaging } from './local-staging.mjs'
import { issueNeopassToken } from '../neo-platform-api/neopass-google-auth.mjs'
import { sha256 } from './evidence.mjs'

const epoch=Date.parse('2026-11-02T16:15:00.000Z')
const now=()=>epoch
const secret='NEO-PRESS-LOCAL-005-test-only-not-a-production-key'
const members=new Map([
  ['reporter',{subject:'reporter',neopassStatus:'active'}],
  ['editor',{subject:'editor',neopassStatus:'active'}],
  ['privacy',{subject:'privacy',neopassStatus:'active'}],
  ['legal',{subject:'legal',neopassStatus:'active'}],
  ['auditor',{subject:'auditor',neopassStatus:'active'}],
  ['outsider',{subject:'outsider',neopassStatus:'active'}],
  ['revoked',{subject:'revoked',neopassStatus:'revoked'}]
])
const registry=new Map([
  ['reporter',{roles:['press:reporter'],caseIds:['CASE-001']}],
  ['editor',{roles:['press:editor'],caseIds:['CASE-001']}],
  ['privacy',{roles:['press:privacy'],caseIds:['CASE-001']}],
  ['legal',{roles:['press:legal'],caseIds:['CASE-001']}],
  ['auditor',{roles:['press:auditor'],caseIds:['CASE-001']}],
  ['outsider',{roles:['press:editor'],caseIds:['CASE-002']}],
  ['revoked',{roles:['press:editor'],caseIds:['CASE-001']}]
])
const authService={async session(subject){return members.get(subject)||null}}
const accessRegistry={async resolveAccess(subject){
  const entry=registry.get(subject)
  return entry?{subject,status:'active',...entry}:null
}}
const pressToken=subject=>issueNeopassToken({
  subject,secret,now,claims:{aud:'neo-press',scope:'press:case-access',token_use:'neopass-session'}
})
const simpleToken=subject=>issueNeopassToken({subject,secret,now})
const auth=subject=>({authorization:'Bearer '+pressToken(subject)})
const demo=title=>({
  caseId:'CASE-001',title,originalSha256:sha256('original '+title),
  sourceLocatorSha256:sha256('fixture locator '+title),sourceTier:'PRIMARY',
  editorialState:'CORROBORATED',accessLevel:'PUBLIC',
  observedAt:new Date(epoch).toISOString(),sourceKind:'DOCUMENT'
})
function store(){return createPressCustodyStore({
  dbPath:':memory:',testMemory:true,now:()=>new Date(epoch)
})}

test('case dashboard paginates sanitized evidence and includes correction holds',()=>{
  const s=store()
  try {
    const a=s.ingest(demo('Public hearing'), 'reporter')
    s.ingest(demo('Second evidence'), 'reporter')
    const page=s.listCaseEvidence('CASE-001',{limit:1,offset:0})
    assert.equal(page.total,2)
    assert.equal(page.records.length,1)
    assert.equal(page.nextOffset,1)
    assert.equal(page.records[0].sourceUrl,undefined)
    assert.equal(page.records[0].original_sha256,undefined)
    assert.equal(page.publicAccess,false)
    assert.throws(()=>s.listCaseEvidence('CASE-001',{limit:500}),/invalid_page/)
    assert.equal(s.listCaseEvidence('CASE-002').total,0)
    const correction=s.submitCorrection(a.id,{
      category:'FACTUAL_ERROR',summary:'Date in the document needs checking.'
    },'editor')
    assert.equal(correction.publicationBlocked,true)
    assert.equal(s.listCorrections(a.id)[0].category,'FACTUAL_ERROR')
    assert.equal(s.listCaseEvidence('CASE-001').records.find(x=>x.id===a.id).correctionHold,true)
    assert.equal(s.verifyCase('CASE-001').valid,true)
  }finally{s.close()}
})
test('open corrections hold approved editorial candidates and keep originals intact',()=>{
  const s=store()
  try {
    const a=s.ingest(demo('Hearing transcript'),'reporter')
    s.review(a.id,'ACCURACY','APPROVE','editor')
    s.review(a.id,'PRIVACY','APPROVE','privacy')
    s.review(a.id,'LEGAL_RISK','APPROVE','legal')
    assert.equal(s.releaseCandidate(a.id).publicationPerformed,false)
    const before=s.lookup(a.id)
    s.submitCorrection(a.id,{category:'SOURCE_DISPUTE',
      summary:'The source transcript attribution is disputed.'},'privacy')
    assert.throws(()=>s.releaseCandidate(a.id),/unresolved_correction_publication_hold/)
    assert.deepEqual(s.lookup(a.id),before)
    assert.throws(()=>s.submitCorrection(a.id,{category:'SOURCE_DISPUTE',summary:'bad'},'editor'),/invalid_correction/)
    assert.equal(s.custody('CASE-001').events.length,5)
  }finally{s.close()}
})
test('loopback stage refuses default or production configuration',()=>{
  assert.throws(()=>createLocalPressStaging(),/local_staging_not_authorized/)
  assert.throws(()=>createLocalPressStaging({
    allowLocalTest:true,mode:'STAGING',store:store(),authService,accessRegistry,jwtSecret:secret
  }),/local_staging_not_authorized/)
})
test('case catalogue and editorial correction endpoints are signed case/role scoped',async()=>{
  const s=store()
  const app=createLocalPressStaging({
    allowLocalTest:true,mode:'EPHEMERAL_TEST_ONLY',store:s,
    authService,accessRegistry,jwtSecret:secret,now
  })
  try {
    const meta=await app.start()
    assert.equal(meta.host,'127.0.0.1')
    assert.equal(meta.productionConnected,false)
    assert.equal(meta.genuineNoogleLoginVerified,false)
    const base=meta.origin
    const catalog='/api/v1/press/cases/CASE-001/evidence'
    const a=s.ingest(demo('Local fixture'),'reporter')
    const noAuth=await fetch(base+catalog)
    assert.equal(noAuth.status,401)
    assert.equal((await fetch(base+catalog,{headers:auth('outsider')})).status,403)
    assert.equal((await fetch(base+catalog,{headers:auth('revoked')})).status,403)
    const good=await fetch(base+catalog,{headers:auth('reporter')})
    assert.equal(good.status,200)
    const body=await good.json()
    assert.equal(body.catalog.records[0].id,a.id)
    assert.equal(body.catalog.records[0].original_sha256,undefined)
    assert.equal((await fetch(base+catalog+'?limit=100', {headers:auth('editor')})).status,400)
    assert.equal((await fetch(base+catalog+'?offset=-1', {headers:auth('editor')})).status,400)
    const route='/api/v1/press/evidence/'+a.id+'/corrections'
    const submit=(subject,payload)=>fetch(base+route,{
      method:'POST',headers:{...auth(subject),'content-type':'application/json'},
      body:JSON.stringify(payload)
    })
    assert.equal((await submit('reporter',{category:'FACTUAL_ERROR',summary:'A published fact should be corrected.'})).status,403)
    assert.equal((await submit('outsider',{category:'FACTUAL_ERROR',summary:'A public statement is disputed.'})).status,403)
    const review=await submit('editor',{category:'FACTUAL_ERROR',summary:'A factual point needs further verification.'})
    assert.equal(review.status,201)
    assert.equal((await review.json()).correction.publicationBlocked,true)
    assert.equal((await fetch(base+route,{headers:auth('auditor')})).status,200)
    assert.equal((await fetch(base+route,{headers:auth('outsider')})).status,403)
    assert.equal((await fetch(base+catalog,{headers:auth('reporter')})).status,200)
    const second=await fetch(base+catalog,{headers:auth('editor')})
    assert.equal((await second.json()).catalog.records[0].correctionHold,true)
    assert.equal((await fetch(base+'/api/v1/press/portal',{headers:auth('outsider')})).status,200)
    const exchange=await fetch(base+'/api/v1/press/session/exchange',{
      method:'POST',headers:{authorization:'Bearer '+simpleToken('reporter')}
    })
    assert.equal(exchange.status,200)
    assert.equal((await exchange.json()).roleClaimsTrusted,false)
  }finally{await app.stop();s.close()}
})
