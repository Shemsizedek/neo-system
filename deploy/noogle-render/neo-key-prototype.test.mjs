import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash, generateKeyPairSync, sign} from 'node:crypto';
import {createNeoKeyPrototype} from './neo-key-prototype.mjs';

const hash = data => createHash('sha256').update(data).digest();
const rpId = 'connect.example.test';
const origin = 'https://' + rpId;
const {privateKey,publicKey} = generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const credentialId='key-one';

function fixture(){
  let now=1000; const records=new Map(); let counter=0;
  const credential={rpId,subject:'member-1',
    publicKey:publicKey.export({type:'spki',format:'pem'}),
    async confirmCounter(next){if(next<=counter)return false;counter=next;return true;}};
  const challengeStore={
    async insert(row){if(records.has(row.challengeHash))throw Error('duplicate');records.set(row.challengeHash,{...row,used:false});},
    async consumeAtomic(p){const r=records.get(p.challengeHash);
      if(!r||r.used||r.expiresAt<=p.now ||
        ['subject','credentialId','purpose','rpId','origin'].some(k=>r[k]!==p[k]))return false;
      r.used=true;return true;}
  };
  const prototype=createNeoKeyPrototype({rpId,origin,challengeStore,
    getCredential:async id=>id===credentialId?credential:null,
    resolveSessionSubject:async session => session?.verified===true?session.subject:null,
    now:()=>now});
  const session={verified:true,subject:'member-1'};
  function assertion(challenge,{clientOrigin=origin,flags=5,count=1}={}){
    const client=Buffer.from(JSON.stringify({type:'webauthn.get',challenge,origin:clientOrigin}));
    const auth=Buffer.alloc(37);hash(Buffer.from(rpId)).copy(auth);auth[32]=flags;auth.writeUInt32BE(count,33);
    return {credentialId,clientDataJSON:client.toString('base64url'),
      authenticatorData:auth.toString('base64url'),
      signature:sign('sha256',Buffer.concat([auth,hash(client)]),privateKey).toString('base64url')};
  }
  return {prototype,session,assertion,advance:ms=>{now+=ms;},records};
}

test('valid signed assertion verifies exactly once; challenge remains hashed in store',async()=>{
  const f=fixture();const issued=await f.prototype.issueAuthenticationChallenge({session:f.session,credentialId});
  assert.equal(issued.challenge.length,43);
  assert.ok([...f.records.values()].every(r=>!('challenge' in r)));
  const a=f.assertion(issued.challenge);
  assert.deepEqual(await f.prototype.verifyAssertion(a),{subject:'member-1',credentialId,assurance:'device-bound'});
  assert.equal(await f.prototype.verifyAssertion(a),null);
});

test('challenge issuance requires matching trusted session and credential ownership',async()=>{
  const f=fixture();
  assert.equal(await f.prototype.issueAuthenticationChallenge({session:{subject:'member-1'},credentialId}),null);
  assert.equal(await f.prototype.issueAuthenticationChallenge({session:{verified:true,subject:'attacker'},credentialId}),null);
  assert.equal(await f.prototype.issueAuthenticationChallenge({session:f.session,credentialId:'missing'}),null);
});

test('wrong origin, missing user verification and tampering reject',async()=>{
  const f=fixture();const {challenge}=await f.prototype.issueAuthenticationChallenge({session:f.session,credentialId});
  assert.equal(await f.prototype.verifyAssertion(f.assertion(challenge,{clientOrigin:'https://evil.example.test'})),null);
  assert.equal(await f.prototype.verifyAssertion(f.assertion(challenge,{flags:1})),null);
  assert.equal(await f.prototype.verifyAssertion({...f.assertion(challenge),signature:'abc'}),null);
  assert.equal((await f.prototype.verifyAssertion(f.assertion(challenge)))?.subject,'member-1');
});

test('expired and incorrect challenge cannot verify',async()=>{
  const f=fixture();const {challenge}=await f.prototype.issueAuthenticationChallenge({session:f.session,credentialId});
  assert.equal(await f.prototype.verifyAssertion(f.assertion('A'.repeat(43))),null);
  f.advance(120001);
  assert.equal(await f.prototype.verifyAssertion(f.assertion(challenge)),null);
});

test('bad configuration fails closed',()=>{
  assert.throws(()=>createNeoKeyPrototype({rpId,origin:'http://connect.example.test'}),/neo_key_configuration_required/);
  assert.throws(()=>createNeoKeyPrototype({rpId,origin,getCredential:async()=>null,resolveSessionSubject:async()=>null}),/secure_challenge_store_required/);
});
