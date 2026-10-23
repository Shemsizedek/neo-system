import test from 'node:test'
import assert from 'node:assert/strict'
import {authorizeCareersSession,oidcConfigurationChecklist} from './session-boundary.mjs'
const claims=(roles=['contributor'])=>({sub:'user1',iss:'https://issuer.example',aud:'neo-careers',exp:Math.floor(Date.now()/1000)+600,roles,employerId:'firm1'})
test('client-provided identity claims alone never authorize',()=>assert.equal(authorizeCareersSession({claims:claims(),action:'view-own-tasks',resourceOwnerId:'user1'}).allowed,false))
test('trusted contributor can access own tasks',()=>assert.equal(authorizeCareersSession({claims:claims(),trustedVerification:true,action:'view-own-tasks',resourceOwnerId:'user1'}).allowed,true))
test('contributor cannot view other accounts',()=>assert.equal(authorizeCareersSession({claims:claims(),trustedVerification:true,action:'view-own-tasks',resourceOwnerId:'user2'}).allowed,false))
test('employer permission is tenant-scoped',()=>assert.equal(authorizeCareersSession({claims:claims(['employer']),trustedVerification:true,action:'manage-employer-drafts',resourceOwnerId:'other'}).allowed,false))
test('expired identity denied',()=>assert.equal(authorizeCareersSession({claims:{...claims(),exp:1},trustedVerification:true,action:'view-own-tasks',resourceOwnerId:'user1'}).allowed,false))
test('payroll review never authorizes signing',()=>{const x=authorizeCareersSession({claims:claims(['payroll-reviewer']),trustedVerification:true,action:'review-compensation'});assert.equal(x.allowed,true);assert.equal(x.canBroadcast,false)})
test('OIDC configuration alone does not establish connectivity',()=>assert.equal(oidcConfigurationChecklist({issuer:'https://issuer.example',audience:'neo-careers',jwksUri:'https://issuer.example/keys'}).adapterConnected,false))
