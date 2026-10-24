import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeoTeleHageBridge} from './hage-device-bridge.mjs';
const approvals=[];
const deps={
 authenticate:async()=>({verified:true,subject:'chaplain'}),
 authorizeDevice:async({subject,deviceId,capability})=>({verified:true,subject,deviceId,capability,id:'guardian-1'}),
 dispatch:async({action})=>({action,esimEnabled:true}),
 recordAudit:async a=>approvals.push(a)
};
const input={sessionToken:'session',deviceId:'first-phone',commandId:'neotele.device.esim_status',language:'nuwaubian',approvalToken:'device-grant'};
test('allowlisted read-only device diagnostics',async()=>{
 const output=await createNeoTeleHageBridge(deps)(input);
 assert.equal(output.action,'READ_ESIM_STATUS');
 assert.equal(output.readOnly,true);
 assert.equal(output.simProvisioningEnabled,false);
 assert.equal(approvals.length,1);
});
test('reject shell and activation commands',async()=>{
 for(const commandId of ['shell.exec','neotele.device.activate_esim','rm -rf /']){
 await assert.rejects(()=>createNeoTeleHageBridge(deps)({...input,commandId}),/command_not_allowlisted/);
 }
});
test('deny unapproved device',async()=>{
 await assert.rejects(()=>createNeoTeleHageBridge({...deps,authorizeDevice:async()=>({verified:false})})(input),/device_authorization_required/);
});
