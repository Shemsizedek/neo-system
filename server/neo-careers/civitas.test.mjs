import test from 'node:test'
import assert from 'node:assert/strict'
import {proposeCivitasAllocation,assessCivitasEquity} from './civitas.mjs'
const p=(tier,w='100.00000000')=>proposeCivitasAllocation({participantId:'node7',tier,dailyWageNomni:w})
test('apprentice fully liquid',()=>{const a=p('Apprentice');assert.equal(a.liquidNomniProposal,'100.00000000');assert.equal(a.housingCreditProposal,'0.00000000')})
test('journeyman 80/20 split',()=>{const a=p('Journeyman');assert.equal(a.liquidNomniProposal,'80.00000000');assert.equal(a.housingCreditProposal,'20.00000000')})
test('master 60/40 split',()=>assert.equal(p('Master Builder').housingCreditProposal,'40.00000000'))
test('eight decimal dust conserved',()=>{const a=p('Journeyman','0.00000001');assert.equal(a.liquidNomniProposal,'0.00000001');assert.equal(a.housingCreditProposal,'0.00000000')})
test('no token issue or deed transfer',()=>{const a=p('Master Builder');assert.equal(a.disbursementEnabled,false);assert.equal(a.deedTransferAuthorized,false)})
test('equity progress not deed ownership',()=>{const a=assessCivitasEquity({sweat:'45',noological:'15',stewardship:'13.5'});assert.equal(a.progressPercent,'73.50');assert.equal(a.deededInterestPercent,'0')})
test('reject equity over 100%',()=>assert.throws(()=>assessCivitasEquity({sweat:'90',grant:'20'})))
test('reject floating point wage',()=>assert.throws(()=>p('Journeyman',100)))
