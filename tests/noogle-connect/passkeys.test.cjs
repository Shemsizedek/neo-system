/* NSEC-023: fail-closed browser WebAuthn regression checks */
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const script=fs.readFileSync('docs/connect/passkeys.js','utf8');
function environment(capabilities, secure=true) {
  let created=0;
  const context={
    URL,Uint8Array,
    window:{isSecureContext:secure,PublicKeyCredential:function(){}},
    navigator:{credentials:{create:async()=>{created++;return {toJSON(){return {id:'fake'};}}}}},
    document:{querySelector:()=>({content:'mock-csrf'})},
    fetch:async(url)=>({
      ok: true,
      json:async()=>url.endsWith('/capabilities')?capabilities:{rp:{id:'connect.holytemples.org'},challenge:'YWJj',user:{id:'YWJj'}}
    }),
    atob:(v)=>Buffer.from(v,'base64').toString('binary'),
    btoa:(v)=>Buffer.from(v,'binary').toString('base64')
  };
  vm.runInNewContext(script,context,{filename:'passkeys.js'});
  return {api:context.window.NoogleWebAuthn, created:()=>created};
}
async function main(){
  const ready={webauthn:'enabled',device_enrollment:'enabled',identity_session:'verified'};
  for (const [name,caps] of [['all disabled',{webauthn:'not_enabled'}],['no identity',{webauthn:'enabled',device_enrollment:'enabled'}],['no enrollment',{webauthn:'enabled',device_enrollment:'not_enabled',identity_session:'verified'}]]){
    const env=environment(caps);
    assert.equal(await env.api.available(),false,name);
    await assert.rejects(()=>env.api.enroll(),/not enabled/,name);
    assert.equal(env.created(),0,name+' must not create credential');
  }
  const noHttps=environment(ready,false);
  assert.equal(await noHttps.api.available(),false);
  await assert.rejects(()=>noHttps.api.enroll(),/not enabled/);
  const yes=environment(ready,true);
  assert.equal(await yes.api.available(),true);
  console.log('NSEC-023 browser fail-closed tests: passed');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
