import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeoTelePortal} from './portal.mjs';
import {createNeoTeleProviderSandbox} from './provider-sandbox.mjs';
const subject='chaplain-001';
const adapters={
 resolveSession:async()=>({verified:true,subject}),
 loadChaplaincyMembership:async()=>({verified:true,subject,cohort:'chaplaincy',status:'ACTIVE'}),
 listServices:async()=>[{memberId:subject,deviceRef:'device-1',state:'REQUESTED',providerId:null}],
 listDevices:async()=>[{subject,deviceRef:'device-1',verified:true,esimSupported:true,unlocked:true}]
};
test('authenticated member sees scoped portal without activation',async()=>{
 const view=await createNeoTelePortal(adapters)('token');
 assert.equal(view.memberId,subject);assert.equal(view.devices[0].compatibility.eligible,true);
 assert.equal(view.services[0].state,'REQUESTED');assert.equal(view.activationEnabled,false);
 assert.equal(JSON.stringify(view).includes('activationUrl'),false);
});
test('inactive or forged membership is blocked',async()=>{
 const portal=createNeoTelePortal({...adapters,loadChaplaincyMembership:async()=>({verified:true,subject,status:'SUSPENDED',cohort:'chaplaincy'})});
 await assert.rejects(()=>portal('token'),/chaplaincy_membership_required/);
});
test('foreign service fails closed',async()=>{
 const portal=createNeoTelePortal({...adapters,listServices:async()=>[{memberId:'another',state:'ACTIVE'}]});
 await assert.rejects(()=>portal('token'),/service_access_denied/);
});
test('sandbox cannot provision or activate',async()=>{
 const provider=createNeoTeleProviderSandbox();
 assert.equal((await provider.checkCompatibility({deviceRef:'device-1'})).eligible,false);
 await assert.rejects(()=>provider.provision(),/LIVE_ESIM_PROVISIONING_DISABLED/);
 await assert.rejects(()=>provider.activate(),/LIVE_ESIM_PROVISIONING_DISABLED/);
});
