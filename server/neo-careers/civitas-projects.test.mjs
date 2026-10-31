import test from 'node:test'
import assert from 'node:assert/strict'
import {createCivitasProjectRegistry,proposeCivitasTreasuryEntry} from './civitas-projects.mjs'
const base={id:'PAD-7',siteCode:'SITE-7',jurisdiction:'US-TX',partnerType:'local-government'}
test('housing project is homeless-first and unverified',()=>{const p=createCivitasProjectRegistry().register(base);assert.equal(p.priority,'homeless-first');assert.equal(p.partnerAgreementVerified,false)})
test('government proposal does not assert partnership',()=>assert.equal(createCivitasProjectRegistry().register(base).partnerAgreementVerified,false))
test('reject duplicate projects',()=>{const r=createCivitasProjectRegistry();r.register(base);assert.throws(()=>r.register(base),/duplicate/)})
test('project milestones need evidence hash',()=>{const r=createCivitasProjectRegistry();r.register(base);assert.throws(()=>r.proposeMilestone({projectId:'PAD-7',stage:'foundation',reviewerId:'reviewer',evidenceDigest:'x'}))})
test('milestone is review-only',()=>{const r=createCivitasProjectRegistry();r.register(base);const m=r.proposeMilestone({projectId:'PAD-7',stage:'utility-core',reviewerId:'reviewer',evidenceDigest:'a'.repeat(64)});assert.equal(m.constructionApproved,false)})
test('housing credits cannot be mistaken for wages or title',()=>{const e=proposeCivitasTreasuryEntry({projectId:'PAD-7',participantId:'worker1',category:'housing-contribution',amount:'2.5',referenceId:'REF-1'});assert.equal(e.clearedFunds,false);assert.equal(e.legalOwnership,false)})
test('project registry cannot send money',()=>assert.equal(createCivitasProjectRegistry().capabilities().fundsTransfer,false))
