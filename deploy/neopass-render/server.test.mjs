import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRenderNeopass} from './server.mjs';
const origin='https://neopass.example';
test('Render runtime serves discovery with durable issuer keys across restart and closed enrollment',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'render-neopass-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const env={NEOPASS_ORIGIN:origin,NEOPASS_DATA_DIR:dir};
 async function start(){const server=await createRenderNeopass({env});await new Promise(r=>server.listen(0,'127.0.0.1',r));return {server,base:`http://127.0.0.1:${server.address().port}`};}
 let f=await start();const keys=await (await fetch(f.base+'/oidc/jwks')).json();assert.equal(JSON.stringify(keys).includes('"d"'),false);
 const health=await (await fetch(f.base+'/healthz')).json();assert.equal(health.registrationEnabled,false);
 assert.equal((await (await fetch(f.base+'/.well-known/openid-configuration')).json()).issuer,origin);
 assert.equal((await (await fetch(f.base+'/api/session')).json()).registrationEnabled,false);
 await new Promise(r=>f.server.close(r));f=await start();assert.deepEqual(await (await fetch(f.base+'/oidc/jwks')).json(),keys);await new Promise(r=>f.server.close(r));
 const path=join(dir,'issuer-keys.json');writeFileSync(path,'broken');await assert.rejects(()=>createRenderNeopass({env}),/issuer_key_file_invalid/);assert.equal(readFileSync(path,'utf8'),'broken');
});
test('rejects ephemeral Render storage, missing data directory, foreign origin and public enrollment',async()=>{
 await assert.rejects(()=>createRenderNeopass({env:{NEOPASS_ORIGIN:origin}}),/persistent_data_directory_required/);
 await assert.rejects(()=>createRenderNeopass({env:{NEOPASS_ORIGIN:origin,NEOPASS_DATA_DIR:'/tmp/neopass',RENDER:'true'}}),/render_persistent_mount_required/);
 await assert.rejects(()=>createRenderNeopass({env:{NEOPASS_ORIGIN:'http://neopass.example',NEOPASS_DATA_DIR:'/tmp/neopass'}}),/canonical_https_origin_required/);
 await assert.rejects(()=>createRenderNeopass({env:{NEOPASS_ORIGIN:origin,NEOPASS_DATA_DIR:'/tmp/neopass',NEOPASS_ALLOW_REGISTRATION:'true'}}),/owner_migration_required/);
});
