import test from 'node:test';import assert from 'node:assert/strict';
import {resolveNeoTeleCommand,createNeoTeleDeviceEnrollment} from './hage-enrollment.mjs';
test('reviewed Hage language maps only read-only controls',()=>{assert.equal(resolveNeoTeleCommand({language:'hage',phrase:'NEOTELE.ESIM.STATUS'}).commandId,'neotele.device.esim_status');assert.throws(()=>resolveNeoTeleCommand({language:'nuwaubian',phrase:'fabricated'}),/unreviewed_or_unsupported_command/);});
test('enrollment requires Guardian proof and stays device-pending',async()=>{
 const f=createNeoTeleDeviceEnrollment({resolveSession:async()=>({verified:true,subject:'member'}),verifyGuardian:async()=>({verified:true,subject:'member',deviceId:'phone1',challengeConsumed:true}),storeEnrollment:async x=>x});
 const result=await f({sessionToken:'s',deviceId:'phone1',guardianAssertion:'proof'});
 assert.equal(result.state,'PENDING_DEVICE_CONFIRMATION');assert.equal(result.simProvisioningEnabled,false);
});
test('reject missing Guardian challenge consumption',async()=>{
 const f=createNeoTeleDeviceEnrollment({resolveSession:async()=>({verified:true,subject:'member'}),verifyGuardian:async()=>({verified:true,subject:'member',deviceId:'phone1',challengeConsumed:false}),storeEnrollment:async x=>x});
 await assert.rejects(()=>f({sessionToken:'s',deviceId:'phone1'}),/guardian_enrollment_verification_required/);
});