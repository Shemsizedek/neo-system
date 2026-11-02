import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { issueNeopassToken, verifyNeopassToken } from '../neo-platform-api/neopass-google-auth.mjs'
import { exchangeNooglePressSession } from './session-exchange.mjs'
import { createPressHttpHandler } from './http.mjs'
import { evaluatePressReadiness, REQUIRED_PRESS_CONTROLS, pressAttestationTestSigningPayload, pressEvidenceDigest } from './readiness.mjs'
import { verifyIndependentPressWitness, pressWitnessTestPayload } from './witness.mjs'

const nowMs=Date.parse('2026-11-02T18:00:00.000Z')
const now=()=>nowMs
const secret='press-test-issuer-key-is-not-for-production-000000'
const jwt=(subject,claims={},ttlSeconds=3600)=>issueNeopassToken({subject,secret,now,ttlSeconds,
  claims})
const baseJwt=subject=>jwt(subject)
const memberships={ alice:{subject:'alice',neopassStatus:'active'}, bob:{subject:'bob',neopassStatus:'active'}, pending:{subject:'pending',neopassStatus:'pending'} }
const assignments={alice:{subject:'alice',status:'active',roles:['press:reporter'],caseIds:['CASE-001']}}
const authService={async session(sub){return memberships[sub]||null}}
const accessRegistry={async resolveAccess(sub){return assignments[sub]||null}}
const config={jwtSecret:secret,authService,accessRegistry,now}
test('Noogle exchange derives case authority exclusively from live registries',async()=>{
  const result=await exchangeNooglePressSession({...config,baseToken:baseJwt('alice')})
  assert.equal(result.ok,true)
  const verified=verifyNeopassToken(result.token,{secret,now})
  assert.equal(verified.sub,'alice')
  assert.equal(verified.aud,'neo-press')
  assert.equal(verified.scope,'press:case-access')
  assert.equal(verified.exp-verified.iat,300)
  assert.equal(result.expiresAt,new Date(nowMs+300_000).toISOString())
  assert.equal((await exchangeNooglePressSession({...config,baseToken:baseJwt('bob')})).status,403)
  assert.equal((await exchangeNooglePressSession({...config,baseToken:baseJwt('pending')})).status,403)
  assert.equal((await exchangeNooglePressSession({...config,baseToken:jwt('alice',{aud:'neo-bank'})})).status,401)
  assert.equal((await exchangeNooglePressSession({...config,baseToken:jwt('alice',{scope:'neo:oracle:execute',token_use:'browser'})})).status,401)
  assert.equal((await exchangeNooglePressSession({...config,baseToken:jwt('alice',{role:'executive-admin',aud:'neo-bank'})})).status,401)
  assert.equal((await exchangeNooglePressSession({...config,baseToken:jwt('alice',{},-1)})).status,401)
  assert.equal((await exchangeNooglePressSession({...config,baseToken:baseJwt('alice'),accessRegistry:null})).status,503)
  assert.equal((await exchangeNooglePressSession({...config,baseToken:baseJwt('alice'),ttlSeconds:3601})).status,503)
})
test('Noogle HTTP session exchange remains fail-closed with restrictive CORS and no credential in logs',async()=>{
  const handler=createPressHttpHandler({enabled:true,store:{},...config})
  const server=createServer(async(req,res)=>{if(!await handler(req,res)){res.writeHead(404);res.end()}})
  server.listen(0,'127.0.0.1');await once(server,'listening')
  const root='http://127.0.0.1:'+server.address().port
  try {
    const route=root+'/api/v1/press/session/exchange'
    assert.equal((await fetch(route,{method:'POST'})).status,401)
    assert.equal((await fetch(route,{method:'POST',headers:{origin:'https://evil.example',authorization:'Bearer '+baseJwt('alice')}})).status,403)
    const ok=await fetch(route,{method:'POST',headers:{origin:'https://neo.holytemples.org',authorization:'Bearer '+baseJwt('alice')}})
    assert.equal(ok.status,200)
    assert.equal(ok.headers.get('cache-control'),'no-store')
    assert.notEqual(ok.headers.get('access-control-allow-origin'),'*')
    const data=await ok.json()
    assert.ok(data.token)
    assert.equal(data.roleClaimsTrusted,false)
    const shell=await fetch(root+'/api/v1/press/login')
    assert.equal(shell.status,200)
    const html=await shell.text()
    assert.match(html,/NeoPass/)
    assert.match(html,/session\/exchange/)
    assert.doesNotMatch(html,new RegExp(secret))
    assert.doesNotMatch(html,/localStorage/)
    assert.equal((await fetch(root+'/api/v1/press/portal')).status,401)
    const signed=await fetch(root+'/api/v1/press/portal',{headers:{authorization:'Bearer '+data.token}})
    assert.equal(signed.status,200)
  }finally{server.close();await once(server,'close')}
})
test('release checklist rejects unsigned, altered, stale and incorrectly targeted control attestations',()=>{
  const {publicKey,privateKey}=generateKeyPairSync('ed25519')
  const deploymentSha='b'.repeat(64)
  const reviewers={offsite:{publicKey,independent:true}}
  const item={controlId:'PRESS_SPECIFIC_CI',deploymentSha,evidenceSha256:pressEvidenceDigest('test-only CI output'),
    reviewerId:'offsite',checkedAt:new Date(nowMs-120000).toISOString(),
    expiresAt:new Date(nowMs+86400000).toISOString(),outcome:'PASS'}
  const signed={...item,signature:sign(null,pressAttestationTestSigningPayload(item),privateKey).toString('base64url')}
  let report=evaluatePressReadiness({attestations:[signed],trustedReviewers:reviewers,deploymentSha,now})
  assert.equal(report.status,'BLOCKED')
  assert.equal(report.deploymentApproved,false)
  assert.equal(report.verifiedAttestationCount,1)
  assert.ok(report.missingControls.includes('NEOPASS_SCOPED_ISSUER'))
  const invalid={...signed,evidenceSha256:'c'.repeat(64)}
  assert.equal(evaluatePressReadiness({attestations:[invalid],trustedReviewers:reviewers,deploymentSha,now}).verifiedAttestationCount,0)
  const stale={...item,expiresAt:new Date(nowMs-20000).toISOString()}
  stale.signature=sign(null,pressAttestationTestSigningPayload(stale),privateKey).toString('base64url')
  assert.equal(evaluatePressReadiness({attestations:[stale],trustedReviewers:reviewers,deploymentSha,now}).verifiedAttestationCount,0)
  const untrusted={offsite:{publicKey,independent:false}}
  assert.equal(evaluatePressReadiness({attestations:[signed],trustedReviewers:untrusted,deploymentSha,now}).verifiedAttestationCount,0)
})
test('all independently signed checks can only make package review-ready, never deploy automatically',()=>{
  const one=generateKeyPairSync('ed25519'), two=generateKeyPairSync('ed25519')
  const deploymentSha='a'.repeat(64)
  const att=REQUIRED_PRESS_CONTROLS.map((controlId,i)=>{
    const reviewerId=i%2?'independent2':'independent1'
    const item={controlId,deploymentSha,evidenceSha256:'e'.repeat(64),reviewerId,
      checkedAt:new Date(nowMs-1000).toISOString(),expiresAt:new Date(nowMs+86400000).toISOString(),outcome:'PASS'}
    const signer= i%2?two.privateKey:one.privateKey
    return {...item,signature:sign(null,pressAttestationTestSigningPayload(item),signer).toString('base64url')}
  })
  const result=evaluatePressReadiness({
    attestations:att,trustedReviewers:{
      independent1:{publicKey:one.publicKey,independent:true},
      independent2:{publicKey:two.publicKey,independent:true}
    },deploymentSha,now
  })
  assert.equal(result.status,'REVIEW_READY')
  assert.equal(result.deploymentApproved,false)
  assert.equal(result.deployExecuted,false)
  assert.equal(result.publicationApproved,false)
})
test('independently fetched signed witness evidence verifies without claiming immutable anchoring',async()=>{
  const keys=generateKeyPairSync('ed25519')
  const receipt={receiptSha256:'a'.repeat(64)}
  const body={witnessId:'third-party-witness',publicationId:'outside-log-0001',
    checkpointSha256:receipt.receiptSha256,logRootSha256:'b'.repeat(64),
    publishedAt:new Date(nowMs-3000).toISOString()}
  const record={...body,signature:sign(null,pressWitnessTestPayload(body),keys.privateKey).toString('base64url')}
  const config={checkpoint:receipt,witnessRecord:record,
    witness:{async getRecord(id){return id===record.publicationId?record:null}},
    trustedWitnessKeys:{'third-party-witness':{publicKey:keys.publicKey,independent:true}},
    newsroomSignerId:'neo-newsroom',now}
  const verified=await verifyIndependentPressWitness(config)
  assert.equal(verified.independentWitnessVerified,true)
  assert.equal(verified.externallyAnchored,false)
  assert.equal((await verifyIndependentPressWitness({...config,newsroomSignerId:'third-party-witness'})).verified,false)
  assert.equal((await verifyIndependentPressWitness({...config,witness:{async getRecord(){return {...record,logRootSha256:'c'.repeat(64)}}}})).verified,false)
  assert.equal((await verifyIndependentPressWitness({...config,witnessRecord:{...record,signature:'tampered'}})).verified,false)
})
