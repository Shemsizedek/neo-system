import assert from 'node:assert/strict';
import test from 'node:test';
import {createNeoKeyNeopassAuthority} from './neopass-authority.mjs';
const now=1_900_000_000_000, epoch=Math.floor(now/1000);
const base={iss:'neo-pass',aud:'neo-key',token_use:'neo-key-session',
  sub:'google:member-1',iat:epoch-30,exp:epoch+120};
function fixture({claims=base,record={subject:'google:member-1',provider:'google',status:'active'},throwRegistry=false}={}){
  return createNeoKeyNeopassAuthority({
    verifyIssuerToken:async()=>claims,
    getAuthoritativeAccount:async()=>{if(throwRegistry)throw Error('db_offline');return record;},
    now:()=>now
  });
}
const session={token:'opaque-signed-token-from-trusted-issuer-verifier'};
test('only fresh purpose/audience and active registry session resolves',async()=>{
  const r=fixture();
  assert.equal(await r.resolveSessionSubject(session),'google:member-1');
  assert.equal(await r.resolveSessionSubject({}),null);
});
test('missing expiration, stale/future or wrong-purpose issuer claims rejected',async()=>{
  for(const c of [{...base,exp:undefined},{...base,exp:epoch-1},{...base,iat:epoch+90},
    {...base,iat:epoch-400},{...base,exp:epoch+900},{...base,aud:'giss'},
    {...base,token_use:'browser'},{...base,iss:'attacker'},
    {...base,sub:null},{...base,nbf:epoch+100}]){
    assert.equal(await fixture({claims:c}).resolveSessionSubject(session),null);
  }
});
test('executive role claim never bypasses unavailable, inactive or mismatched registry',async()=>{
  const claims={...base,role:'executive-admin',email:'admin@example.test'};
  assert.equal(await fixture({claims,throwRegistry:true}).resolveSessionSubject(session),null);
  assert.equal(await fixture({claims,record:{...base,subject:base.sub,status:'pending',provider:'google'}}).resolveSessionSubject(session),null);
  assert.equal(await fixture({claims,record:{subject:'other',status:'active',provider:'google'}}).resolveSessionSubject(session),null);
});
test('missing token verification or registry dependency fails closed',()=>{
  assert.throws(()=>createNeoKeyNeopassAuthority(),/neo_key_neopass_authority_configuration_required/);
});
