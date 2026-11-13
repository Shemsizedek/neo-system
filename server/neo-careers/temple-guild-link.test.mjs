import test from 'node:test'
import assert from 'node:assert/strict'
import {proposeGuildLearningLink} from './temple-guild-link.mjs'
const base={apprenticeSubject:'student1',track:'software',gissEnrollmentId:'enroll1',mentorSubject:'mentor1'}
test('guild membership cannot be inferred from a career track',()=>assert.equal(proposeGuildLearningLink(base).status,'blocked'))
test('guild source must be canonical and approved',()=>assert.equal(proposeGuildLearningLink({...base,guildAuthorityRecord:{guildId:'guild-1',provenance:'ASSISTANT_INFERENCE',approved:true}}).status,'blocked'))
test('canonical guild association never itself grants membership or school credit',()=>{const x=proposeGuildLearningLink({...base,guildAuthorityRecord:{guildId:'guild-1',provenance:'CANONICAL_TEMPLE_SOURCE',approved:true}});assert.equal(x.status,'ready-for-authorized-review');assert.equal(x.memberAdmitted,false);assert.equal(x.rankGranted,false)})
