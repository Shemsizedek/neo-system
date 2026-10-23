import test from 'node:test'
import assert from 'node:assert/strict'
import {assessCareersIntegration,careersEnvironmentChecklist} from './integration-health.mjs'
test('default integrations all fail closed',()=>{const x=assessCareersIntegration();assert.equal(x.readyForAuthenticatedReadOnlyStaging,false);assert.equal(x.payrollEnabled,false)})
test('database alone does not authorize authenticated display',()=>{const x=assessCareersIntegration({database:{connectionTestPassed:true,migrationsApplied:true,tenantIsolationVerified:true}});assert.equal(x.readyForAuthenticatedReadOnlyStaging,false)})
test('database plus verified identity allows read-only staging',()=>{const x=assessCareersIntegration({database:{connectionTestPassed:true,migrationsApplied:true,tenantIsolationVerified:true},identity:{issuerVerified:true,tokenSignatureVerified:true,audienceVerified:true,replayProtectionVerified:true}});assert.equal(x.readyForAuthenticatedReadOnlyStaging,true);assert.equal(x.payrollEnabled,false)})
test('chain data is insufficient without Counterparty issuance evidence',()=>{const x=assessCareersIntegration({bitcoin:{trustedNodeConnected:true,networkVerified:true,confirmationTestPassed:true}});assert.equal(x.readyForVerifiedAssetDisplay,false)})
test('missing environment variables reported without values',()=>{const x=careersEnvironmentChecklist({});assert.equal(x.missing.length,4);assert.equal(x.connectionTested,false)})
test('reject insecure OIDC endpoint',()=>{const x=careersEnvironmentChecklist({NEO_CAREERS_DATABASE_URL:'postgres://test',NEO_CAREERS_OIDC_ISSUER:'http://insecure',NEO_CAREERS_OIDC_AUDIENCE:'neo-careers',NEO_CAREERS_OIDC_JWKS_URL:'https://keys.example'});assert.equal(x.configured,false)})
