import test from 'node:test'
import assert from 'node:assert/strict'
import {assessGovernmentPartnership,buildCivitasProjectDashboard} from './civitas-public-review.mjs'
const partner={partnerId:'CITY1',jurisdiction:'US-NC',authorityName:'Proposed housing authority',agreementHash:'a'.repeat(64)}
const project={id:'P1',siteCode:'NODE-1',priority:'homeless-first',phase:'foundation'}
test('proposal alone never claims public partnership',()=>assert.equal(assessGovernmentPartnership(partner).publicPartnershipClaimPermitted,false))
test('verified paperwork still requires publication clearance',()=>assert.equal(assessGovernmentPartnership({...partner,signatoryVerified:true,authorizationVerified:true,expiryVerified:true}).publicPartnershipClaimPermitted,false))
test('malformed agreement receipt rejected',()=>assert.throws(()=>assessGovernmentPartnership({...partner,agreementHash:'bad'})))
test('other participant cannot see personal profile',()=>assert.equal(buildCivitasProjectDashboard({project,authorizedParticipantId:'worker1',viewerId:'other'}).participant,null))
test('project milestones scoped by project id',()=>{const x=buildCivitasProjectDashboard({project,milestones:[{projectId:'P1',stage:'foundation',status:'pending'},{projectId:'P2',stage:'inspection',status:'verified'}]});assert.equal(x.milestones.length,1)})
test('funding record is not proof of paid money',()=>{const x=buildCivitasProjectDashboard({project,funding:[{projectId:'P1',category:'material-sponsorship',status:'paid'}]});assert.equal(x.funding[0].status,'verification-required');assert.equal(x.transfersEnabled,false)})
