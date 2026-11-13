import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {EvidenceVaultApi} from '../../src/explorer/evidenceVaultApi.ts';
import {createEvidenceVault} from './store.mjs';
import {createHandler} from './server.mjs';

test('existing Explorer client methods work with principal identity and no reviewer header',async t=>{
 const vault=createEvidenceVault(':memory:');
 const handler=createHandler(vault,{credentials:[{token:'synthetic-client',actor:'verified-demo-principal',roles:['read','ingest','review']}]});
 const headers=[];
 const server=http.createServer((req,res)=>{headers.push(req.headers);return handler(req,res)});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));vault.close()});
 const base=`http://127.0.0.1:${server.address().port}`;
 const client=new EvidenceVaultApi(base,'synthetic-client');
 const entry=await client.ingest({asset:'SYNTHETIC',title:'Synthetic client fixture',sourceType:'OTHER'},'spoofed-actor');
 const reviewed=await client.review('SYNTHETIC',entry.id,'ACCEPTED','spoofed-actor','Synthetic only');
 assert.equal(reviewed.reviewer,'verified-demo-principal');
 assert.equal((await client.list('SYNTHETIC')).length,1);
 assert.equal((await client.audit('SYNTHETIC')).length,2);
 assert.ok(headers.every(h=>!h['x-reviewer']));
 await assert.rejects(new EvidenceVaultApi(base).list('SYNTHETIC'),/401/);
 await assert.rejects(new EvidenceVaultApi(base,'bad').list('SYNTHETIC'),/401/);
});
