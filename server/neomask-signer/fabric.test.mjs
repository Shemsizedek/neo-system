import test from 'node:test'
import assert from 'node:assert/strict'
import {registerSigner,createPairingChallenge,verifyPairingChallenge,scoreDomainReputation,inspectTransaction,guardianFirewall,requestSignature,signerNetworkSnapshot} from './fabric.mjs'

test('signer registry never exports private keys',()=>{const s=registerSigner({signer_id:'s1',owner_id:'u',signer_type:'MOBILE_SECURE_KEYSTORE',public_key:'pub',hardware_backed:true});assert.equal(s.private_key_exported,false)})
test('pairing challenge verifies only via supplied signature verifier',()=>{const c=createPairingChallenge({signerId:'s1',deviceId:'d1'});const r=verifyPairingChallenge({challenge:c,signature:'ok',verifySignature:({signature})=>signature==='ok'});assert.equal(r.verified,true)})
test('domain reputation blocks obvious phishing patterns',()=>{assert.equal(scoreDomainReputation({origin:'https://seed-phrase.example'}).risk,'HIGH')})
test('transaction firewall requires user presence',()=>{const s=registerSigner({signer_id:'s1',owner_id:'u',signer_type:'HARDWARE_WALLET',public_key:'pub'});const g=guardianFirewall({origin:'https://merchant.example',transaction:{kind:'BITCOIN',amount:1},signer:s,userPresent:false});assert.equal(g.allowed,false)})
test('signature result cannot leak secrets',async()=>{const s=registerSigner({signer_id:'s1',owner_id:'u',signer_type:'HARDWARE_WALLET',public_key:'pub'});await assert.rejects(()=>requestSignature({origin:'https://merchant.example',transaction:{kind:'BITCOIN',amount:1},signer:s,userPresent:true,adapter:{sign:async()=>({private_key:'x'})}}),/secret_exposure/)})
test('snapshot reports signer network posture',()=>{assert.equal(signerNetworkSnapshot({}).private_key_export,false)})
