import test from 'node:test';
import assert from 'node:assert/strict';
import {createIsolatedPostgresAuthenticator} from './staging-postgres-app.mjs';
import {SQL_STATEMENTS} from './postgres-ceremony-store.mjs';
const rpId='connect.example.test',origin='https://'+rpId;
const subject='synthetic-account',sessionKey='synthetic-session-12345678';
const credentialId='credential-id-0123456789';
const nonce={registration:'A'.repeat(43),authentication:'B'.repeat(43)};
let now=1000000;
const table=new Map();
const pool={async query(sql,p){
  const id=p[0];
  if (sql===SQL_STATEMENTS.INSERT) {
    const old=table.get(id);
    if(old && old.consumed_at===null && old.expires_at>p[4])return {rowCount:0,rows:[]};
    table.set(id,{kind:p[1],challenge:p[2],expires_at:p[3],consumed_at:null});
    return {rowCount:1,rows:[{}]};
  }
  if (sql===SQL_STATEMENTS.TAKE) {
    const row=table.get(id);
    if(!row || row.kind!==p[2] || row.consumed_at!==null || row.expires_at<=p[1])return {rowCount:0,rows:[]};
    row.consumed_at=p[1];return {rowCount:1,rows:[row]};
  }
  throw Error('unexpected_sql');
}};
function makeHandler() {
  table.clear();now=1000000;
  const calls=[];
  const handler=createIsolatedPostgresAuthenticator({
    enabled:true,origin,rpId,pool,hmacKey:Buffer.alloc(32,11),now:()=>now,
    authenticateRequest:async()=>({subject,sessionKey,session:{token:'test'}}),
    verifyCsrf:async()=>true,takeRateLimit:async()=>true,
    lookupCredentialId:async()=>credentialId,
    authorizeEnrollment:async()=>({allowed:true,bootstrapEvidence:{synthetic:true}}),
    staging:{
      beginRegistration:async()=>({publicKey:{challenge:nonce.registration,user:{id:'AQ'}},expiresAt:now+30000}),
      finishRegistration:async({response})=>{calls.push('register');return {registered:true,credentialId:response.id,permissionGranted:false};},
      beginAuthentication:async()=>({publicKey:{challenge:nonce.authentication,allowCredentials:[{id:credentialId}]},expiresAt:now+30000}),
      verifyAuthentication:async({response})=>{calls.push('authenticate');return {assurance:'webauthn-verified',subject,credentialId:response.id,origin,rpId,action:'authenticate',purpose:'authenticate',verifiedAt:now};}
    }
  });
  async function post(path,body={}) {
    const request=new Request(origin+path,{method:'POST',headers:{Origin:origin,'X-CSRF-Token':'synthetic-token','Content-Type':'application/json'},body:JSON.stringify(body)});
    const res=await handler(request);return {status:res.status,body:await res.json()};
  }
  return {post,calls};
}
function credential(type,challenge){
  return {id:credentialId,rawId:credentialId,type:'public-key',response:{
    clientDataJSON:Buffer.from(JSON.stringify({type,origin,challenge,crossOrigin:false})).toString('base64url')
  }};
}
const root='/api/neopass/authenticator/';
test('disabled composition never touches PostgreSQL',async()=>{
  const handle=createIsolatedPostgresAuthenticator();
  assert.equal((await handle(new Request(origin))).status,503);
});
test('staging registration: one-use challenge, no permission grant (mock verifier)',async()=>{
  const f=makeHandler();
  assert.equal((await f.post(root+'registration/options')).status,200);
  const body={credential:credential('webauthn.create',nonce.registration)};
  assert.deepEqual((await f.post(root+'registration/verify',body)).body,
    {registered:true,credentialId,permissionGranted:false});
  assert.equal((await f.post(root+'registration/verify',body)).status,403);
  assert.deepEqual(f.calls,['register']);
});
test('staging authentication: replay rejected (mock verifier)',async()=>{
  const f=makeHandler();
  assert.equal((await f.post(root+'authentication/options')).status,200);
  const body={credential:credential('webauthn.get',nonce.authentication)};
  assert.deepEqual((await f.post(root+'authentication/verify',body)).body,
    {verified:true,credentialId,permissionGranted:false});
  assert.equal((await f.post(root+'authentication/verify',body)).status,403);
  assert.deepEqual(f.calls,['authenticate']);
});
test('expired HTTP ceremony never reaches mock verifier',async()=>{
  const f=makeHandler();await f.post(root+'authentication/options');now+=30001;
  assert.equal((await f.post(root+'authentication/verify',{credential:credential('webauthn.get',nonce.authentication)})).status,403);
  assert.deepEqual(f.calls,[]);
});
