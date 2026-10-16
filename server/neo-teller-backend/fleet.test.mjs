import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {registerFleetDevice,verifyEnrollmentChallenge,stageDeployment,authorizeFleetCommand,fleetStatus} from './fleet.mjs';
test('enrollment requires possession of registered key',()=>{
 const {publicKey,privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 const pem=publicKey.export({type:'spki',format:'pem'});
 const device=registerFleetDevice({deviceId:'atm-1',group:'pilot',publicKeyPem:pem});
 assert.equal(device.cashOperationsEnabled,false);
 const challenge='unique-server-issued-challenge';
 const signature=sign('sha256',Buffer.from(challenge),privateKey).toString('base64');
 assert.equal(verifyEnrollmentChallenge(device,challenge,signature,pem),true);
 assert.equal(verifyEnrollmentChallenge(device,challenge+'x',signature,pem),false);
});
test('firmware requires two approvals and stays staged',()=>{
 assert.throws(()=>stageDeployment({releaseId:'r1',group:'pilot',artifactSha256:'a'.repeat(64),approvals:['one']}),/TWO_APPROVALS/);
 assert.equal(stageDeployment({releaseId:'r1',group:'pilot',artifactSha256:'a'.repeat(64),approvals:['one','two']}).autoInstall,false);
});
test('remote unlock denied and command audit required',()=>{
 assert.throws(()=>authorizeFleetCommand({deviceId:'atm-1',command:'UNLOCK',operatorRole:'FLEET_ADMIN',reason:'test',requestId:'req1'}),/COMMAND_NOT_ALLOWED/);
 assert.equal(authorizeFleetCommand({deviceId:'atm-1',command:'LOCK',operatorRole:'FLEET_ADMIN',reason:'tamper',requestId:'req2'}).remoteUnlock,false);
 assert.equal(fleetStatus([{state:'LOCKED'},{state:'ACTIVE'}]).total,2);
});
