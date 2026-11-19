import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash,generateKeyPairSync,randomBytes,sign} from 'node:crypto';
import {createNeoKeyAssertionService} from './assertion-verifier.mjs';

const rpId='connect.example.test',origin=`https://${rpId}`;
const sha256=data=>createHash('sha256').update(data).digest();
const hex=data=>createHash('sha256').update(data).digest('hex');
function hdr(major,n){
  if(n<24)return Buffer.from([(major<<5)|n]);
  if(n<256)return Buffer.from([(major<<5)|24,n]);
  if(n<65536){const b=Buffer.alloc(3);b[0]=(major<<5)|25;b.writeUInt16BE(n,1);return b;}
  throw Error('fixture length');
}
function cbor(v){
  if(typeof v==='number')return hdr(v>=0?0:1,v>=0?v:-1-v);
  if(Buffer.isBuffer(v))return Buffer.concat([hdr(2,v.length),v]);
  if(v instanceof Map)return Buffer.concat([hdr(5,v.size),...[...v].flatMap(([k,val])=>[cbor(k),cbor(val)])]);
  throw Error('unsupported fixture');
}
function fixture({initialCounter=0}={}){
  let clock=1000;const records=new Map();
  const {publicKey,privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  const jwk=publicKey.export({format:'jwk'});
  const cose=cbor(new Map([[1,2],[3,-7],[-1,1],[-2,Buffer.from(jwk.x,'base64url')],[-3,Buffer.from(jwk.y,'base64url')]]));
  const id=randomBytes(24).toString('base64url');
  let storedCounter=initialCounter,revoked=false;
  const store={
    async getActiveCredential(credentialId){
      return credentialId===id&&!revoked?{subject:'member-1',rpId,publicKeyCose:cose.toString('base64url'),signCount:storedCounter,revokedAt:null}:null;
    },
    async insertAuthenticationChallenge(p){records.set(p.challengeHash,{...p,used:false});},
    async getPendingAuthenticationChallenge(p){
      const r=records.get(p.challengeHash);
      return Boolean(r&&!r.used&&r.expiresAt>p.now&&r.subject===p.subject&&r.credentialId===p.credentialId&&r.rpId===p.rpId&&r.origin===p.origin);
    },
    async confirmAuthenticationAtomic(p){
      const r=records.get(p.challengeHash);
      if(!r||r.used||r.expiresAt<=p.now||r.subject!==p.subject||r.credentialId!==p.credentialId||
         r.rpId!==p.rpId||r.origin!==p.origin||revoked||
         !(storedCounter===0&&p.newCounter===0||p.newCounter>storedCounter))return false;
      r.used=true;storedCounter=p.newCounter;return true;
    }
  };
  const service=createNeoKeyAssertionService({rpId,origin,store,now:()=>clock,
    resolveSessionSubject:async session=>session?.authenticated===true?session.subject:null});
  function assertion(challenge,{counter=1,flags=5,clientOrigin=origin,wrongSignature=false}={}){
    const client=Buffer.from(JSON.stringify({type:'webauthn.get',challenge,origin:clientOrigin,crossOrigin:false}));
    const auth=Buffer.alloc(37);
    sha256(Buffer.from(rpId)).copy(auth);auth[32]=flags;auth.writeUInt32BE(counter,33);
    const data=Buffer.concat([auth,sha256(client)]);
    return {id,rawId:id,type:'public-key',response:{
      clientDataJSON:client.toString('base64url'),
      authenticatorData:auth.toString('base64url'),
      signature:(wrongSignature?randomBytes(64):sign('sha256',data,privateKey)).toString('base64url'),
      userHandle:null
    },clientExtensionResults:{}};
  }
  return {service,id,assertion,records,getCounter:()=>storedCounter,revoke:()=>{revoked=true;},
    advance:ms=>{clock+=ms;},session:{authenticated:true,subject:'member-1'}};
}

test('real WebAuthn signed assertion validates, updates counter and denies replay',async()=>{
  const f=fixture();
  const issued=await f.service.begin({session:f.session,credentialId:f.id});
  assert.equal(issued.publicKey.userVerification,'required');
  const signed=f.assertion(issued.publicKey.challenge);
  const proof=await f.service.verify({response:signed});
  assert.equal(proof?.assurance,'webauthn-verified');
  assert.equal(proof.subject,'member-1');
  assert.equal(proof.purpose,'authenticate');
  assert.equal(f.getCounter(),1);
  assert.equal(await f.service.verify({response:signed}),null);
  assert.ok([...f.records.values()].every(r=>!('challenge' in r)));
});
test('bad signature, wrong origin and missing UV cannot consume challenge',async()=>{
  const f=fixture(),issued=await f.service.begin({session:f.session,credentialId:f.id});
  const challenge=issued.publicKey.challenge;
  assert.equal(await f.service.verify({response:f.assertion(challenge,{wrongSignature:true})}),null);
  assert.equal(await f.service.verify({response:f.assertion(challenge,{clientOrigin:'https://evil.example.test'})}),null);
  assert.equal(await f.service.verify({response:f.assertion(challenge,{flags:1})}),null);
  assert.equal((await f.service.verify({response:f.assertion(challenge)}))?.credentialId,f.id);
});
test('wrong member, revoked credential, counter regression, expiry and replay fail',async()=>{
  const f=fixture({initialCounter:6});
  assert.equal(await f.service.begin({session:{authenticated:true,subject:'attacker'},credentialId:f.id}),null);
  const issued=await f.service.begin({session:f.session,credentialId:f.id});
  assert.equal(await f.service.verify({response:f.assertion(issued.publicKey.challenge,{counter:6})}),null);
  assert.equal((await f.service.verify({response:f.assertion(issued.publicKey.challenge,{counter:7})}))?.credentialId,f.id);
  const later=await f.service.begin({session:f.session,credentialId:f.id});
  f.advance(120001);
  assert.equal(await f.service.verify({response:f.assertion(later.publicKey.challenge,{counter:8})}),null);
  f.revoke();
  assert.equal(await f.service.begin({session:f.session,credentialId:f.id}),null);
});
test('zero counters accepted for synced authenticators, but challenge remains one-use',async()=>{
  const f=fixture();
  const issued=await f.service.begin({session:f.session,credentialId:f.id});
  const signed=f.assertion(issued.publicKey.challenge,{counter:0});
  assert.equal((await f.service.verify({response:signed}))?.assurance,'webauthn-verified');
  assert.equal(f.getCounter(),0);
  assert.equal(await f.service.verify({response:signed}),null);
});
test('assertion service fails closed when trusted DB or identity adapter missing',()=>{
  assert.throws(()=>createNeoKeyAssertionService({rpId,origin}),/neo_key_assertion_configuration_required/);
  assert.throws(()=>createNeoKeyAssertionService({rpId,origin:'http://connect.example.test'}),/neo_key_assertion_configuration_required/);
});
