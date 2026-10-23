import test from 'node:test'
import assert from 'node:assert/strict'
import {createPermissionStore,simulateTransaction,guardianDecision} from './security.js'

test('permissions are origin scoped',()=>{const s=createPermissionStore();s.grant('https://a.example',{permissions:['accounts'],accounts:['bc1a']});assert.deepEqual(s.accounts('https://a.example'),['bc1a']);assert.throws(()=>s.require('https://b.example','accounts'))})
test('simulation never claims broadcast or key exposure',()=>{const x=simulateTransaction({kind:'COUNTERPARTY',asset:'XCP',amount:1,destination:'bc1x'});assert.equal(x.broadcast,false);assert.equal(x.private_key_exposed,false)})
test('guardian blocks suspicious domains',()=>{const sim=simulateTransaction({kind:'BITCOIN',amount:1});assert.equal(guardianDecision({origin:'https://seed-phrase.example',simulation:sim}).allowed,false)})
