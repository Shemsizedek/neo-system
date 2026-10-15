import assert from 'node:assert/strict';
import test from 'node:test';
import {createConnectReadiness} from './connect-readiness.mjs';
test('all deployment prerequisites fail closed with no enrollment privilege',async()=>{
 const s=await createConnectReadiness({getIssuerStatus:async()=>{throw Error('offline');},getDatabaseStatus:async()=>true})();
 assert.equal(s.issuerVerified,false);assert.equal(s.durableStoreReady,true);
 assert.equal(s.persistentDeviceEnrollmentEnabled,false);assert.equal(s.deviceControlEnabled,false);
});
test('healthy prerequisites do not silently enable enrollment',async()=>{
 const s=await createConnectReadiness({getIssuerStatus:async()=>true,getDatabaseStatus:async()=>true})();
 assert.equal(s.webauthnRegistrationEnabled,false);
 assert.equal(s.persistentDeviceEnrollmentEnabled,false);
});
