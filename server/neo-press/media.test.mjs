import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, chmodSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomBytes, generateKeyPairSync } from 'node:crypto'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { createSealedPressMedia } from './sealed-media.mjs'
import { sha256 } from './evidence.mjs'
import { createPressCustodyStore } from './custody-store.mjs'
import { createSignedCheckpoint, verifySignedCheckpoint, localTestEd25519Signer } from './checkpoint.mjs'
import { createPressHttpHandler } from './http.mjs'
import { issueNeopassToken } from '../neo-platform-api/neopass-google-auth.mjs'

const NOW=Date.parse('2026-11-02T16:30:00Z')
const secret='NEO-PRESS-003-tests-only-a-long-independent-token-secret'
const key=randomBytes(32)
const clock=()=>NOW
const credentials=(subject, claims={})=>issueNeopassToken({
  subject, secret, issuer:'neo-pass', now:clock,
  claims:{aud:'neo-press',scope:'press:case-access',token_use:'neopass-session',...claims}
})
const grants={
  reporter:{roles:['press:reporter'],caseIds:['CASE-001']},
  editor:{roles:['press:editor'],caseIds:['CASE-001']},
  privacy:{roles:['press:privacy'],caseIds:['CASE-001']},
  legal:{roles:['press:legal'],caseIds:['CASE-001']},
  auditor:{roles:['press:auditor'],caseIds:['CASE-001']},
  outsider:{roles:['press:editor'],caseIds:['CASE-OTHER']}
}
const authService={async session(sub){return {subject:sub,neopassStatus:'active'}}}
const accessRegistry={async resolveAccess(sub){return grants[sub]?{subject:sub,status:'active',...grants[sub]}:null}}
const mediaInput=(content, extra={})=>({
  title:'Investigative photograph',originalSha256:sha256(content),
  sourceLocatorSha256:sha256('public-event'),sourceTier:'PRIMARY',
  editorialState:'CORROBORATED',accessLevel:'PUBLIC',
  sourceKind:'DOCUMENT',observedAt:new Date(NOW).toISOString(),...extra
})
function fixture() {
  const root=mkdtempSync(join(tmpdir(),'press-v3-'))
  const vault=join(root,'private-media')
  const media=createSealedPressMedia({rootDir:vault,encryptionKey:key,keyId:'local-key-version-001'})
  const custody=createPressCustodyStore({dbPath:':memory:',testMemory:true,now:()=>new Date(NOW)})
  return {root,vault,media,custody,close(){
    custody.close();rmSync(root,{recursive:true,force:true})
  }}
}
const headers=(subject, more={})=>({authorization:'Bearer '+credentials(subject),...more})
async function withServer(fn) {
  const state=fixture()
  const handler=createPressHttpHandler({
    store:state.custody,mediaStore:state.media,authService,accessRegistry,
    enabled:true,jwtSecret:secret,now:clock
  })
  const server=createServer(async(req,res)=>{
    if(!await handler(req,res)){res.writeHead(404);res.end()}
  })
  server.listen(0,'127.0.0.1');await once(server,'listening')
  try {await fn('http://127.0.0.1:'+server.address().port,state)}
  finally {server.close();await once(server,'close');state.close()}
}

test('encrypted private vault refuses weak keys, relative roots and insecure permissions',()=>{
  const root=mkdtempSync(join(tmpdir(),'press-v3-permission-'))
  try {
    assert.throws(()=>createSealedPressMedia({rootDir:root,encryptionKey:randomBytes(8),keyId:'short'}),/256_bit/)
    assert.throws(()=>createSealedPressMedia({rootDir:'data/press',encryptionKey:key,keyId:'key-001'}),/private_absolute/)
    chmodSync(root,0o755)
    assert.throws(()=>createSealedPressMedia({rootDir:root,encryptionKey:key,keyId:'key-001'}),/permissions/)
  }finally{rmSync(root,{recursive:true,force:true})}
})
test('original media sealed on disk only in ciphertext, tied to case, ID and SHA-256',()=>{
  const f=fixture()
  try {
    const bytes=Buffer.from('private reference photograph source data')
    const {id}=f.custody.ingest({...mediaInput(bytes),caseId:'CASE-001'},'reporter')
    const receipt=f.media.seal({caseId:'CASE-001',evidenceId:id,originalBytes:bytes,expectedSha256:sha256(bytes)})
    const path=join(f.vault,id+'.npress')
    const encrypted=readFileSync(path)
    assert.equal(encrypted.includes(bytes),false)
    assert.equal(receipt.originalSha256,sha256(bytes))
    assert.equal(f.media.verify({caseId:'CASE-001',evidenceId:id,originalSha256:receipt.originalSha256}).integrityVerified,true)
    assert.throws(()=>f.media.seal({caseId:'CASE-001',evidenceId:id,originalBytes:bytes}),/EEXIST/)
    assert.throws(()=>f.media.verify({caseId:'CASE-OTHER',evidenceId:id,originalSha256:receipt.originalSha256}),/authentication_failed/)
    encrypted[encrypted.length-1]^=1
    writeFileSync(path,encrypted)
    assert.throws(()=>f.media.verify({caseId:'CASE-001',evidenceId:id,originalSha256:receipt.originalSha256}),/authentication_failed/)
  }finally{f.close()}
})
test('verified encrypted original is linked to custody and independently checked at preflight',()=>{
  const f=fixture()
  try {
    const bytes=Buffer.from('original source media')
    const {id}=f.custody.ingest({...mediaInput(bytes),caseId:'CASE-001'},'reporter')
    f.custody.review(id,'ACCURACY','APPROVE','editor')
    f.custody.review(id,'PRIVACY','APPROVE','privacy')
    f.custody.review(id,'LEGAL_RISK','APPROVE','legal')
    assert.throws(()=>f.custody.publicationPreflight(id,f.media),/original_media_verification/)
    assert.throws(()=>f.media.seal({caseId:'CASE-001',evidenceId:id,originalBytes:Buffer.from('tampered bytes'),expectedSha256:sha256(bytes)}),/mismatch/)
    const receipt=f.media.seal({caseId:'CASE-001',evidenceId:id,originalBytes:bytes,expectedSha256:sha256(bytes)})
    const proof=f.media.verify({caseId:'CASE-001',evidenceId:id,originalSha256:sha256(bytes)})
    assert.equal(f.custody.attachVerifiedMedia(id,receipt,proof,'reporter').originalVerified,true)
    assert.equal(f.custody.getMediaStatus(id).originalVerified,true)
    const pre=f.custody.publicationPreflight(id,f.media)
    assert.equal(pre.originalMediaVerified,true)
    assert.equal(pre.publicationPerformed,false)
    assert.equal(pre.readyForExternalPublication,false)
    assert.equal(f.custody.custody('CASE-001').events.length,5)
  }finally{f.close()}
})
test('signed checkpoint verifies under an independently supplied public key; not externally anchored',async()=>{
  const f=fixture()
  try {
    const {id}=f.custody.ingest({...mediaInput('journalism source'),caseId:'CASE-001'},'reporter')
    const {privateKey,publicKey}=generateKeyPairSync('ed25519')
    const receipt=await createSignedCheckpoint({
      custodyStore:f.custody,caseId:'CASE-001',
      signer:localTestEd25519Signer(privateKey),signerId:'test-external-signer',
      now:()=>new Date(NOW)
    })
    assert.equal(receipt.externallyAnchored,false)
    assert.deepEqual(verifySignedCheckpoint({receipt,trustedPublicKey:publicKey,custodyStore:f.custody}),
      {signatureVerified:true,matchesCurrentCustody:true,externallyAnchored:false})
    assert.equal(verifySignedCheckpoint({receipt:{...receipt,signature:'tampered'},trustedPublicKey:publicKey,custodyStore:f.custody}).signatureVerified,false)
    f.custody.review(id,'ACCURACY','APPROVE','editor')
    const stale=verifySignedCheckpoint({receipt,trustedPublicKey:publicKey,custodyStore:f.custody})
    assert.equal(stale.signatureVerified,true)
    assert.equal(stale.matchesCurrentCustody,false)
  }finally{f.close()}
})
test('authorized reporter can upload bytes; editor preflight remains blocked until media verified',async()=>{
  await withServer(async(base,f)=>{
    const bytes=Buffer.from('test original source bytes')
    const intake=await fetch(base+'/api/v1/press/cases/CASE-001/evidence',{
      method:'POST',headers:headers('reporter',{'content-type':'application/json'}),
      body:JSON.stringify(mediaInput(bytes))
    })
    assert.equal(intake.status,201)
    const id=(await intake.json()).evidence.id
    f.custody.review(id,'ACCURACY','APPROVE','editor')
    f.custody.review(id,'PRIVACY','APPROVE','privacy')
    f.custody.review(id,'LEGAL_RISK','APPROVE','legal')
    const endpoint=base+'/api/v1/press/evidence/'+id
    assert.equal((await fetch(endpoint+'/release-preflight',{headers:headers('editor')})).status,409)
    assert.equal((await fetch(endpoint+'/media',{method:'POST',headers:headers('outsider',{'content-type':'application/octet-stream'}),body:bytes})).status,403)
    assert.equal((await fetch(endpoint+'/media',{method:'POST',headers:headers('reporter',{'content-type':'application/octet-stream'}),body:Buffer.from('wrong')})).status,400)
    const upload=await fetch(endpoint+'/media',{method:'POST',headers:headers('reporter',{'content-type':'application/octet-stream'}),body:bytes})
    assert.equal(upload.status,201)
    assert.equal((await upload.json()).media.originalVerified,true)
    const result=await fetch(endpoint+'/release-preflight',{headers:headers('editor')})
    assert.equal(result.status,200)
    const body=await result.json()
    assert.equal(body.preflight.originalMediaVerified,true)
    assert.equal(body.published,false)
    assert.equal(body.preflight.readyForExternalPublication,false)
    assert.equal((await fetch(endpoint+'/release-preflight',{headers:headers('outsider')})).status,403)
  })
})
test('credential intake stays private, verified as original bytes but does not certify current press status',async()=>{
  await withServer(async(base,f)=>{
    const bytes=Buffer.from('historical press card scan fixture, no real private data')
    const intake=await fetch(base+'/api/v1/press/cases/CASE-001/sealed-intake',{
      method:'POST',headers:headers('reporter',{'content-type':'application/octet-stream'}),body:bytes
    })
    assert.equal(intake.status,201)
    const data=await intake.json()
    assert.equal(data.media.originalVerified,true)
    assert.equal(data.credentialCurrentStatusVerified,false)
    const item=f.custody.lookup(data.evidenceId)
    assert.equal(item.access_level,'RESTRICTED')
    assert.equal(item.original_sha256,sha256(bytes))
    assert.equal(item.source_type,'PRESS_METADATA')
    assert.equal(f.custody.verifyCase('CASE-001').count,2)
    assert.throws(()=>f.custody.releaseCandidate(data.evidenceId),/not_eligible/)
  })
})
test('private portal is authenticated, no credential or token appears in HTML, no caching',async()=>{
  await withServer(async(base)=>{
    const path=base+'/api/v1/press/portal'
    assert.equal((await fetch(path)).status,401)
    const wrong=await fetch(path,{headers:{authorization:'Bearer '+credentials('editor',{aud:'neo-bank'})}})
    assert.equal(wrong.status,401)
    const good=await fetch(path,{headers:headers('editor')})
    assert.equal(good.status,200)
    assert.match(good.headers.get('content-security-policy'),/nonce-/)
    assert.equal(good.headers.get('cache-control'),'no-store')
    const body=await good.text()
    assert.match(body,/Investigative Press|Private Press Desk/)
    assert.doesNotMatch(body,new RegExp(secret))
    assert.doesNotMatch(body,/Lawiy-Zodok/)
    assert.doesNotMatch(body,/localStorage/)
  })
})
