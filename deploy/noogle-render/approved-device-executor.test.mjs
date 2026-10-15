import assert from 'node:assert/strict';
import test from 'node:test';
import {createApprovedDeviceExecutor} from './approved-device-executor.mjs';
const approval={approvalId:'approval-1',subject:'owner',deviceId:'device-1',action:'devices.rename',label:'Phone'};
function fixture({failAt='',approvalValid=true}={}){
 const calls=[];let released=false;
 const client={query:async(sql,args=[])=>{calls.push({sql,args});if(failAt&&sql.includes(failAt))throw Error('injected_failure');return {rows:sql.startsWith('UPDATE')?[{id:'x'}]:[]};},release:()=>{released=true;}};
 const execute=createApprovedDeviceExecutor({pool:{connect:async()=>client},
  verifyApproval:async()=>approvalValid?approval:null});
 return {execute,calls,released:()=>released};
}
const request={approval:'opaque',subject:'owner',deviceId:'device-1',action:'devices.rename',label:'Phone',now:100};
test('one transaction consumes approval, mutates device, writes audit and commits',async()=>{
 const f=fixture();assert.equal((await f.execute(request)).applied,true);
 assert.deepEqual(f.calls.map(x=>x.sql.split(' ')[0]),['BEGIN','UPDATE','UPDATE','INSERT','COMMIT']);
 assert.equal(f.calls[1].args[1],'owner');assert.equal(f.released(),true);
});
test('audit failure rolls back authorization and device mutation',async()=>{
 const f=fixture({failAt:'INSERT INTO noogle_connect_device_audit'});
 await assert.rejects(()=>f.execute(request),/injected_failure/);
 assert.equal(f.calls.at(-1).sql,'ROLLBACK');assert.equal(f.released(),true);
});
test('forged approval cannot start a transaction',async()=>{
 const f=fixture({approvalValid:false});
 await assert.rejects(()=>f.execute(request),/approval_required/);assert.equal(f.calls.length,0);
});
test('renaming with altered payload is rejected',async()=>{
 const f=fixture();await assert.rejects(()=>f.execute({...request,label:'Different'}),/approval_required/);
});
