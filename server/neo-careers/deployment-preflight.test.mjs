import test from 'node:test'
import assert from 'node:assert/strict'
import {assessCareersDeployment} from './deployment-preflight.mjs'
test('default refuses production activation',()=>{const s=assessCareersDeployment();assert.equal(s.canEnableAuthenticatedCareersPortal,false);assert.equal(s.canPayWorkers,false)})
test('database only does not activate',()=>{const s=assessCareersDeployment({database:{dedicatedProject:true,privateAccessVerified:true,migrationApplied:true,rowIsolationTestPassed:true}});assert.equal(s.canEnableAuthenticatedCareersPortal,false)})
test('authenticated portal needs verified identity and authorization',()=>{const s=assessCareersDeployment({database:{dedicatedProject:true,privateAccessVerified:true,migrationApplied:true,rowIsolationTestPassed:true},oidc:{issuerVerified:true,jwksSignatureVerified:true,clientAudienceVerified:true,callbackTestPassed:true},authorization:{workerIsolationPassed:true,employerIsolationPassed:true,nonceReplayTestPassed:true}});assert.equal(s.canEnableAuthenticatedCareersPortal,true);assert.equal(s.canPayWorkers,false)})
test('independent asset checks cannot enable payments',()=>{const s=assessCareersDeployment({assets:{counterpartyIssuerVerified:true,bitcoinNetworkVerified:true}});assert.equal(s.canPublishVerifiedAssets,true);assert.equal(s.canDistributeEquity,false)})
