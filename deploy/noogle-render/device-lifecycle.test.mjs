import assert from 'node:assert/strict';
import test from 'node:test';
import { createDeviceLifecycle } from './device-lifecycle.mjs';
const id='11111111-1111-4111-8111-111111111111';
test('device management enforces device-bound identity and owner scope',async()=>{
 const records=[{id,subject:'a',type:'android',label:'Old',createdAt:1,revokedAt:null}];
 const store={
  list:async sub=>records.filter(x=>x.subject===sub),
  renameIfOwned:async(sub,device,label)=>{const x=records.find(r=>r.subject===sub&&r.id===device&&!r.revokedAt);if(!x)return false;x.label=label;return true;},
  revokeIfOwned:async(sub,device,time)=>{const x=records.find(r=>r.subject===sub&&r.id===device&&!r.revokedAt);if(!x)return false;x.revokedAt=time;return true;}
 };
 const manage=createDeviceLifecycle({store,now:()=>100,verifyIdentity:async x=>x});
 const a={subject:'a',assurance:'device-bound'},b={subject:'b',assurance:'device-bound'};
 await assert.rejects(()=>manage.list({subject:'a',assurance:'session-only'}),/device_authentication_required/);
 assert.equal((await manage.list(a)).length,1);assert.equal((await manage.list(b)).length,0);
 await assert.rejects(()=>manage.rename(b,id,'Attack'),/device_not_found/);
 assert.equal((await manage.rename(a,id,'Chromebook')).label,'Chromebook');
 await assert.rejects(()=>manage.revoke(b,id),/device_not_found/);
 assert.deepEqual(await manage.revoke(a,id),{id,revoked:true});
 await assert.rejects(()=>manage.rename(a,id,'Again'),/device_not_found/);
});
