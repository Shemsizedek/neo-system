import test from 'node:test'
import assert from 'node:assert/strict'
import {buildCivitasParticipantDashboard} from './civitas-dashboard.mjs'
const participant={id:'Node7',tier:'Journeyman',housingPriority:'homeless-first'}
const assignment={phase:'Foundations',activity:'Build shell',dailyWageNomni:'100.00000000'}
test('homeless-first priority is preserved',()=>assert.equal(buildCivitasParticipantDashboard({participant,assignment}).participant.housingPriority,'homeless-first'))
test('80/20 allocation appears as proposal only',()=>{const x=buildCivitasParticipantDashboard({participant,assignment});assert.equal(x.allocation.housingCreditProposal,'20.00000000');assert.equal(x.fundsTransferred,false)})
test('equity progress is not deed title',()=>{const x=buildCivitasParticipantDashboard({participant,assignment,progress:{sweat:'45',noological:'15',stewardship:'13.5'}});assert.equal(x.equity.progressPercent,'73.50');assert.equal(x.ownership.recordedTitleVerified,false)})
test('other participant ledger entries excluded',()=>{const x=buildCivitasParticipantDashboard({participant,assignment,ledger:[{id:'1',participantId:'other',type:'housing-credit'},{id:'2',participantId:'Node7',type:'housing-credit'}]});assert.equal(x.credits.length,1)})
test('remote contributors supported',()=>assert.equal(buildCivitasParticipantDashboard({participant,assignment:{...assignment,phase:'Remote Contribution'}}).assignment.phase,'Remote Contribution'))
test('unrecognized phase rejected',()=>assert.throws(()=>buildCivitasParticipantDashboard({participant,assignment:{...assignment,phase:'Cash out'}})))
