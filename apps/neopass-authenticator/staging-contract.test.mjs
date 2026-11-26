import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectStagingReadiness,STAGING_OPERATIONS} from './staging-contract.mjs';
const valid={version:1,environment:'isolated-staging',ready:true,registrationEnabled:true,authenticationEnabled:true,independentSecurityReviewApproved:true,serverEnforcesCsrf:true,serverEnforcesRateLimits:true,durableChallengeStoreReady:true,verifiedIssuerReady:true,hardwareTestCertified:true,origin:'https://connect.example.test',rpId:'connect.example.test',contract:'neo-key-staging-v1'};
test('readiness requires all explicit gates',()=>assert.equal(inspectStagingReadiness(valid,valid.origin).ready,true));
for(const name of Object.keys(valid)) test('fails closed when '+name+' missing',()=>{const input={...valid};delete input[name];assert.equal(inspectStagingReadiness(input,valid.origin).ready,false)});
test('rejects origin mismatch',()=>assert.equal(inspectStagingReadiness(valid,'https://other.example.test').ready,false));
test('rejects untrusted status',()=>assert.equal(inspectStagingReadiness({ready:true},valid.origin).ready,false));
test('operation paths are same-origin only',()=>{for(const path of Object.values(STAGING_OPERATIONS))assert.match(path,/^\/api\/neopass\/authenticator\//)});
