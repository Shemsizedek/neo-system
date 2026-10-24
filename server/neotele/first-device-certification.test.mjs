import test from 'node:test';
import assert from 'node:assert/strict';
import {assessFirstDeviceRelease} from './first-device-certification.mjs';
const sha='a'.repeat(40),apk='b'.repeat(64);
test('old APK does not certify new source',()=>{
 const r=assessFirstDeviceRelease({expectedCommit:sha,build:{conclusion:'success',commit:'c'.repeat(40),apkSha256:apk},tests:{conclusion:'success',commit:sha}});
 assert.equal(r.buildCertified,false);assert.equal(r.readyForSupervisedDebugPilot,false);
});
test('certified matching build still does not imply installation',()=>{
 const r=assessFirstDeviceRelease({expectedCommit:sha,build:{conclusion:'success',commit:sha,apkSha256:apk},tests:{conclusion:'success',commit:sha}});
 assert.equal(r.buildCertified,true);assert.equal(r.devicePilotVerified,false);assert.equal(r.productionReady,false);
});
test('explicit matching installation and diagnostics allow only supervised pilot status',()=>{
 const r=assessFirstDeviceRelease({expectedCommit:sha,build:{conclusion:'success',commit:sha,apkSha256:apk},tests:{conclusion:'success',commit:sha},device:{consentConfirmed:true,installedApkSha256:apk,localDiagnosticsVerified:true}});
 assert.equal(r.devicePilotVerified,true);assert.equal(r.liveEsimProvisioningEnabled,false);
});
