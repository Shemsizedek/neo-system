import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { issueNeopassToken } from '../neo-platform-api/neopass-google-auth.mjs'
import { sha256 } from './evidence.mjs'
import { createPressCustodyStore } from './custody-store.mjs'
import { createPressHttpHandler } from './http.mjs'

const fixed = Date.parse('2026-11-02T16:00:00Z')
const now = () => fixed
const secret = 'local-only-test-secret-should-never-be-used-in-production'
const users = new Map([
  ['reporter', ['press:reporter','CASE-001']],
  ['editor', ['press:editor','CASE-001']],
  ['privacy', ['press:privacy','CASE-001']],
  ['legal', ['press:legal','CASE-001']],
  ['auditor', ['press:auditor','CASE-001']],
  ['outsider', ['press:reporter','CASE-999']],
  ['generic-admin', []]
])
const authService = { async session(subject) {
  return { subject, neopassStatus: subject === 'pending' ? 'pending' : 'active' }
} }
const accessRegistry = { async resolveAccess(subject) {
  if (subject === 'pending') return { subject, status: 'active', roles:['press:editor'],caseIds:['CASE-001'] }
  const data = users.get(subject)
  if (!data) return null
  return { subject, status:'active', roles:data.length ? [data[0]] : [], caseIds:data.length ? [data[1]] : [] }
} }
const token = (subject, claims = {}) => issueNeopassToken({
  subject, secret, issuer:'neo-pass', now, claims: {
    aud:'neo-press', scope:'press:case-access', token_use:'neopass-session', ...claims
  }
})
const headers = (subject, extra = {}) => ({
  authorization:'Bearer ' + token(subject),
  'content-type':'application/json', ...extra
})
const input = (overrides = {}) => ({
  title:'Public meeting transcript summary', originalSha256:sha256('original-immutable-media'),
  sourceLocatorSha256:sha256('public-reference'), sourceTier:'PRIMARY',
  editorialState:'CORROBORATED', accessLevel:'PUBLIC',
  observedAt:'2026-11-02T15:00:00Z', sourceKind:'DOCUMENT', ...overrides
})
const store = () => createPressCustodyStore({ dbPath:':memory:', testMemory:true, now:() => new Date(fixed) })

async function withHttp(run, options = {}) {
  const custody = store()
  const handler = createPressHttpHandler({
    store:custody, authService, accessRegistry, jwtSecret:secret,
    enabled:true, now, ...options
  })
  const server = createServer(async(req,res) => {
    if (!await handler(req,res)) { res.writeHead(404); res.end() }
  })
  server.listen(0,'127.0.0.1')
  await once(server, 'listening')
  try { await run('http://127.0.0.1:' + server.address().port, custody) }
  finally { server.close(); await once(server,'close'); custody.close() }
}
const post = (base, path, subject, data, extra={}) =>
  fetch(base + path, {method:'POST',headers:headers(subject,extra),body:JSON.stringify(data)})

test('production storage refuses absent, shared or unapproved in-memory database', () => {
  assert.throws(() => createPressCustodyStore(), /dedicated_private/)
  assert.throws(() => createPressCustodyStore({dbPath:'data/neo-evidence-vault.sqlite'}), /dedicated_private/)
  assert.throws(() => createPressCustodyStore({dbPath:':memory:'}), /dedicated_private/)
})
test('private metadata is transactionally registered in existing Evidence Vault schema; original media not stored', () => {
  const s=store()
  try {
    const created=s.ingest({...input(),caseId:'CASE-001'},'reporter')
    assert.equal(created.sourceVerified,false)
    const record=s.lookup(created.id)
    assert.equal(record.asset,'PRESS:CASE-001')
    assert.equal(record.original_sha256,sha256('original-immutable-media'))
    assert.equal(record.source_url,undefined)
    const custody=s.custody('CASE-001')
    assert.equal(custody.integrity.valid,true)
    assert.equal(custody.integrity.externallyAnchored,false)
    assert.equal(custody.events.length,1)
  }finally{s.close()}
})
test('three independent human roles are required; same reporter/reviewer cannot approve own work', () => {
  const s=store()
  try {
    const {id}=s.ingest({...input(),caseId:'CASE-001'},'reporter')
    assert.throws(() => s.releaseCandidate(id), /approvals/)
    assert.throws(() => s.review(id,'ACCURACY','APPROVE','reporter'), /independent_review/)
    s.review(id,'ACCURACY','APPROVE','editor')
    assert.throws(() => s.review(id,'PRIVACY','APPROVE','editor'), /independent_reviewer/)
    s.review(id,'PRIVACY','APPROVE','privacy')
    assert.throws(() => s.releaseCandidate(id), /approvals/)
    s.review(id,'LEGAL_RISK','APPROVE','legal')
    const candidate=s.releaseCandidate(id)
    assert.equal(candidate.publicationPerformed,false)
    assert.equal(s.verifyCase('CASE-001').valid,true)
    assert.equal(s.custody('CASE-001').events.length,4)
  }finally{s.close()}
})
test('confidential records, allegations and rejected reviews cannot yield publication candidates', () => {
  const s=store()
  try {
    for (const variant of [
      {accessLevel:'RESTRICTED'}, {editorialState:'ALLEGED'}
    ]) {
      const {id}=s.ingest({...input(variant),caseId:'CASE-001'},'reporter')
      s.review(id,'ACCURACY','APPROVE','editor')
      s.review(id,'PRIVACY','APPROVE','privacy')
      s.review(id,'LEGAL_RISK','APPROVE','legal')
      assert.throws(() => s.releaseCandidate(id), /not_eligible/)
    }
    const {id}=s.ingest({...input(),caseId:'CASE-001'},'reporter')
    s.review(id,'ACCURACY','REJECT','editor')
    s.review(id,'PRIVACY','APPROVE','privacy')
    s.review(id,'LEGAL_RISK','APPROVE','legal')
    assert.throws(() => s.releaseCandidate(id), /approvals/)
    assert.throws(() => s.ingest({...input({sourceKind:'CREDENTIAL',accessLevel:'RESTRICTED'}),caseId:'CASE-001'},'reporter'), /credential_intake_requires/)
  }finally{s.close()}
})
test('tampering with SQL custody event is detected without claiming external anchoring', () => {
  const directory=mkdtempSync(join(tmpdir(),'neo-press-test-'))
  const filename=join(directory,'press.sqlite')
  const s=createPressCustodyStore({dbPath:filename,now:() => new Date(fixed)})
  try {
    s.ingest({...input(),caseId:'CASE-001'},'reporter')
    const outsider=new DatabaseSync(filename)
    try { outsider.exec("UPDATE press_custody SET event_type='ALTERED' WHERE seq=1") }
    finally { outsider.close() }
    assert.equal(s.verifyCase('CASE-001').valid,false)
  } finally {s.close();rmSync(directory,{recursive:true,force:true})}
})
test('disabled / unconfigured API fails closed and no wildcard CORS', async () => {
  await withHttp(async base => {
    const r=await fetch(base+'/api/v1/press/cases/CASE-001/custody')
    assert.equal(r.status,503)
    assert.notEqual(r.headers.get('access-control-allow-origin'),'*')
  }, {enabled:false})
})
test('rejects forged role headers, wrong audience, pending membership, outside cases and raw confidential uploads', async () => {
  await withHttp(async base => {
    const route='/api/v1/press/cases/CASE-001/evidence'
    assert.equal((await fetch(base+route,{method:'POST',headers:{'content-type':'application/json','x-reviewer':'editor'},body:JSON.stringify(input())})).status,401)
    assert.equal((await fetch(base+route,{method:'POST',headers:{authorization:'Bearer '+token('reporter',{aud:'neo-bank'}),'content-type':'application/json'},body:JSON.stringify(input())})).status,401)
    assert.equal((await post(base,route,'pending',input())).status,403)
    assert.equal((await post(base,route,'generic-admin',input(),{'x-reviewer':'reporter','x-neopass-role':'press:reporter'})).status,403)
    assert.equal((await post(base,route,'outsider',input())).status,403)
    assert.equal((await post(base,route,'reporter',input({rawBytes:'secret'}))).status,400)
    assert.equal((await post(base,route,'reporter',input(),{origin:'https://evil.example'})).status,403)
  })
})
test('three approved, separately assigned NEOpass members can prepare an unpublished review candidate', async () => {
  await withHttp(async base => {
    const r=await post(base,'/api/v1/press/cases/CASE-001/evidence','reporter',input())
    assert.equal(r.status,201)
    const payload=await r.json()
    const id=payload.evidence.id
    const path='/api/v1/press/evidence/'+id
    const before=await fetch(base+path+'/release-candidate',{headers:headers('editor')})
    assert.equal(before.status,409)
    assert.equal((await post(base,path+'/review','reporter',{gate:'ACCURACY',decision:'APPROVE'})).status,403)
    assert.equal((await post(base,path+'/review','editor',{gate:'ACCURACY',decision:'APPROVE'})).status,200)
    assert.equal((await post(base,path+'/review','privacy',{gate:'PRIVACY',decision:'APPROVE'})).status,200)
    assert.equal((await post(base,path+'/review','legal',{gate:'LEGAL_RISK',decision:'APPROVE'})).status,200)
    assert.equal((await fetch(base+path+'/release-candidate',{headers:headers('auditor')})).status,403)
    const approved=await fetch(base+path+'/release-candidate',{headers:headers('editor')})
    assert.equal(approved.status,200)
    const final=await approved.json()
    assert.equal(final.published,false)
    assert.equal(final.candidate.publicationPerformed,false)
    assert.equal(final.candidate.sourceUrl,undefined)
    const custody=await fetch(base+'/api/v1/press/cases/CASE-001/custody',{headers:headers('auditor')})
    assert.equal(custody.status,200)
    assert.equal((await custody.json()).custody.integrity.count,4)
  })
})
