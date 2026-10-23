import test from 'node:test'
import assert from 'node:assert/strict'
import {EXISTING_GISS_ROUTES,checkCareersGissAuthorization,createExistingGissReadClient} from './existing-giss-client.mjs'
const claims={sub:'s1',aud:'neo-careers',scope:'giss:read',exp:Math.floor(Date.now()/1000)+500}
test('existing registered gisd-office grant cannot be silently reused',()=>assert.equal(checkCareersGissAuthorization({tokenClaims:{...claims,aud:'gisd-office'},approvedClient:'gisd-office',studentSubject:'s1',consentConfirmed:true}).authorized,false))
test('no consent is denied',()=>assert.equal(checkCareersGissAuthorization({tokenClaims:claims,approvedClient:'neo-careers',studentSubject:'s1'}).authorized,false))
test('client must be registered separately',()=>assert.ok(checkCareersGissAuthorization({tokenClaims:claims,approvedClient:'gisd-office',studentSubject:'s1',consentConfirmed:true}).missing.includes('careers_client_registration_required')))
test('valid client check remains read only',()=>{const x=checkCareersGissAuthorization({tokenClaims:claims,approvedClient:'neo-careers',studentSubject:'s1',consentConfirmed:true});assert.equal(x.authorized,true);assert.equal(x.canEnroll,false)})
test('untrusted callers cannot fetch academic records',async()=>{let called=false;const c=createExistingGissReadClient({baseUrl:'https://school.example',getJson:async()=>{called=true}});assert.equal((await c.getConsentedRecords({studentSubject:'s1'})).ok,false);assert.equal(called,false)})
test('authorized academic read is subject-bound',async()=>{const c=createExistingGissReadClient({baseUrl:'https://school.example',getJson:async()=>({subject:'other'})});assert.equal((await c.getConsentedRecords({authorization:'backend-token',tokenClaims:claims,approvedClient:'neo-careers',studentSubject:'s1',consentConfirmed:true})).ok,false)})
test('real GISS read endpoint is used',()=>assert.equal(EXISTING_GISS_ROUTES.consentedAcademicRead,'/auth/giss/records'))
