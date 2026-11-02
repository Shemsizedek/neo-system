import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { generateKeyPairSync, sign } from 'node:crypto'
import { createPressSecurityPolicy, createLocalPressLimiter } from './security-policy.mjs'
import { createPressHttpHandler } from './http.mjs'
import { issueNeopassToken } from '../neo-platform-api/neopass-google-auth.mjs'
import { sha256 } from './evidence.mjs'
import { createPressCustodyStore } from './custody-store.mjs'
import { createSignedCheckpoint, localTestEd25519Signer } from './checkpoint.mjs'
import { inspectPressCustody } from './audit-verifier.mjs'
import { pressWitnessTestPayload } from './witness.mjs'

const stamp=Date.parse('2026-11-02T21:00:00.000Z')
const now=()=>stamp
const secret='press-gate-007-test-secret-is-not-production-key'
const reporter='press-reporter'
const editor='press-editor'
const privacy='press-privacy'
const legal='press-legal'
const issue=(subject,claims={})=>issueNeopassToken({subject,secret,now,claims})
const scoped=subject=>issue(subject,{aud:'neo-press',scope:'press:case-access',token_use:'neopass-session'})
const members=[reporter,editor,privacy,legal].reduce((map,subject)=>{
  map[subject]={subject,neopassStatus:'active'};return map
},{})
const roles={
 [reporter]:'press:reporter',[editor]:'press:editor',
 [privacy]:'press:privacy',[legal]:'press:legal'
}
const authService={async session(sub){return members[sub]||null}}
const accessRegistry={async resolveAccess(sub){
 return roles[sub] ? {subject:sub,status:'active',roles:[roles[sub]],caseIds:['CASE-001']} : null
}}
const store=()=>createPressCustodyStore({dbPath:':memory:',testMemory:true,now:()=>new Date(stamp)})
const entry=title=>({
 caseId:'CASE-001',title,sourceTier:'PRIMARY',editorialState:'CORROBORATED',
 accessLevel:'PUBLIC',sourceKind:'DOCUMENT',originalSha256:sha256(title+' real file bytes'),
 sourceLocatorSha256:sha256(title+' public reference'),observedAt:new Date(stamp).toISOString()
})
test('local-only limiter bounds token plus socket, never trusts spoofed forwarded-for',async()=>{
 const limit=createLocalPressLimiter({now,maxRequests:2})
 const policy=createPressSecurityPolicy({mode:'LOCAL_TEST',limiter:limit})
 const req={socket:{remoteAddress:'127.0.0.1'},headers:{'x-forwarded-for':'198.51.100.2'}}
 assert.equal((await policy.authorize({req,token:'token-a',operation:'press'})).allowed,true)
 req.headers['x-forwarded-for']='203.0.113.99'
 assert.equal((await policy.authorize({req,token:'token-a',operation:'press'})).allowed,true)
 const third=await policy.authorize({req,token:'token-a',operation:'press'})
 assert.equal(third.allowed,false)
 assert.equal(third.status,429)
 assert.equal((await policy.authorize({req,token:'token-b',operation:'press'})).allowed,true)
 assert.equal(limit.localOnly,true)
})
test('production security policy denies absent distributed limiter and revocation dependencies',async()=>{
 const absent=createPressSecurityPolicy({mode:'PRODUCTION'})
 assert.equal(absent.productionConfigured,false)
 assert.equal((await absent.authorize({token:'not-an-authority'})).status,503)
 const invalidLocal=createPressSecurityPolicy({mode:'PRODUCTION',limiter:createLocalPressLimiter(),revocationService:{
   async isRevokedToken(){return false},async isRevokedSubject(){return false}
 },issuerMonitor:{async isVerifiedHealthy(){return true}}})
 assert.equal(invalidLocal.productionConfigured,false)
})
test('production adapter rejects revoked subjects and tokens, unhealthy issuer and limiter failures',async()=>{
 let deniedToken=false,deniedSubject=false,healthy=true,allow=true
 const limiter={localOnly:false,async consume(){return allow}}
 const revocationService={
  async isRevokedToken(){return deniedToken},
  async isRevokedSubject(){return deniedSubject}
 }
 const issuerMonitor={async isVerifiedHealthy(){return healthy}}
 const policy=createPressSecurityPolicy({mode:'PRODUCTION',limiter,revocationService,issuerMonitor})
 assert.equal(policy.productionConfigured,true)
 const input={token:'test-signed-string',subject:'reporter-1',req:{socket:{remoteAddress:'127.0.0.1'}}}
 assert.equal((await policy.authorize(input)).allowed,true)
 deniedSubject=true
 assert.equal((await policy.authorize(input)).status,401)
 deniedSubject=false;deniedToken=true
 assert.equal((await policy.authorize(input)).status,401)
 deniedToken=false;healthy=false
 assert.equal((await policy.authorize(input)).status,503)
 healthy=true;allow=false
 assert.equal((await policy.authorize(input)).status,429)
})
test('press gateway refuses productionMode without certified policy; revocation blocks JWT and exchange',async()=>{
 const s=store(), sockets=[]
 const start=async opts=>{
  const handler=createPressHttpHandler({
   enabled:true,store:s,authService,accessRegistry,jwtSecret:secret,now,...opts
  })
  const server=createServer(async(req,res)=>{if(!await handler(req,res)){res.writeHead(404);res.end()}})
  server.listen(0,'127.0.0.1');await once(server,'listening')
  sockets.push(server)
  return 'http://127.0.0.1:'+server.address().port
 }
 try{
  const noDeps=await start({productionMode:true})
  assert.equal((await fetch(noDeps+'/api/v1/press/login')).status,503)
  const revoke={
   async isRevokedToken(){return false},
   async isRevokedSubject(subject){return subject===reporter}
  }
  const guard=createPressSecurityPolicy({mode:'PRODUCTION',
   limiter:{localOnly:false,async consume(){return true}},
   revocationService:revoke,issuerMonitor:{async isVerifiedHealthy(){return true}}
  })
  const endpoint=await start({productionMode:true,securityPolicy:guard})
  const exchange=await fetch(endpoint+'/api/v1/press/session/exchange',{
   method:'POST',headers:{authorization:'Bearer '+issue(reporter)}
  })
  assert.equal(exchange.status,401)
  const protectedApi=await fetch(endpoint+'/api/v1/press/portal',{
   headers:{authorization:'Bearer '+scoped(reporter)}
  })
  assert.equal(protectedApi.status,401)
  const granted=await fetch(endpoint+'/api/v1/press/portal',{
   headers:{authorization:'Bearer '+scoped(editor)}
  })
  assert.equal(granted.status,200)
 }finally{
  for(const server of sockets)await new Promise(resolve=>server.close(resolve))
  s.close()
 }
})
test('two competing decisions on the same editorial gate do not split custody history',async()=>{
 const s=store()
 try{
  const {id}=s.ingest(entry('meeting minutes'),reporter)
  const opened=s.submitCorrection(id,{category:'FACTUAL_ERROR',
   summary:'Public document date requires independent checking.'},editor)
  const responses=await Promise.allSettled(
   [privacy,legal].map(subject=>Promise.resolve().then(()=>s.decideCorrection(opened.id,{
    gate:'PRIVACY',decision:'APPROVE',rationale:'Verified correction against original document.'
   },subject)))
  )
  assert.equal(responses.filter(x=>x.status==='fulfilled').length,1)
  assert.equal(responses.filter(x=>x.status==='rejected').length,1)
  assert.equal(s.correctionLookup(opened.id).status,'OPEN')
  assert.equal(s.verifyCase('CASE-001').valid,true)
  const events=s.custody('CASE-001').events
  assert.equal(events.filter(x=>x.event_type==='CORRECTION_PRIVACY_APPROVE').length,1)
 }finally{s.close()}
})
test('signed and independently retrieved custody acknowledgment rejects stale history',async()=>{
 const s=store()
 try{
  const {id}=s.ingest(entry('physical evidence inventory'),reporter)
  const newsroom=generateKeyPairSync('ed25519')
  const witnessKeys=generateKeyPairSync('ed25519')
  const checkpoint=await createSignedCheckpoint({custodyStore:s,caseId:'CASE-001',
   signer:localTestEd25519Signer(newsroom.privateKey),signerId:'neopress-newsroom',
   now:()=>new Date(stamp)})
  const data={witnessId:'independent-witness',publicationId:'evidence-ledger-0001',
   checkpointSha256:checkpoint.receiptSha256,logRootSha256:'e'.repeat(64),
   publishedAt:new Date(stamp).toISOString()}
  const record={...data,signature:sign(null,pressWitnessTestPayload(data),
   witnessKeys.privateKey).toString('base64url')}
  const options={caseId:'CASE-001',custodyStore:s,checkpoint,
   checkpointPublicKey:newsroom.publicKey,witnessRecord:record,
   witness:{async getRecord(){return record}},
   trustedWitnessKeys:{'independent-witness':{publicKey:witnessKeys.publicKey,independent:true}},
   newsroomSignerId:'neopress-newsroom',now}
  const result=await inspectPressCustody(options)
  assert.equal(result.status,'WITNESS_ACKNOWLEDGED')
  assert.equal(result.externallyAnchored,false)
  assert.equal(result.publicationPermitted,false)
  s.review(id,'ACCURACY','APPROVE',editor)
  const stale=await inspectPressCustody(options)
  assert.equal(stale.status,'BLOCKED')
  assert.equal(stale.reason,'checkpoint_mismatch_or_stale')
 }finally{s.close()}
})
