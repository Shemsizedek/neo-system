import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolveNeoBitcoinCapability,auditNeoBitcoinRegistry} from './project-policy.mjs'
const load=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'))
test('registered apps and inventoried systems match repository registries',async()=>{
 const apps=(await load('../../architecture/neo-services-normalization.json')).apps.map(a=>a.id)
 const systems=(await load('../../architecture/neo-existing-system-inventory.json')).systems.map(s=>s.system_id)
 assert.deepEqual(auditNeoBitcoinRegistry({apps,systems}),{ok:true,missingApps:[],missingSystems:[],staleApps:[],staleSystems:[]})
})
test('all project capabilities are deny by default',()=>{
 for(const scope of ['apps','systems','workstreams']){
   for(const id of ['unknown','__proto__','constructor','']){
     for(const capability of ['bitcoin.observe','counterparty.observe','bvm.validate','btc.broadcast']){
       assert.equal(resolveNeoBitcoinCapability({scope,id,capability}).allowed,false)
     }
   }
 }
})
test('NEO wallet and payment apps receive only observed-chain gateway',()=>{
 for(const id of ['neo-counter','neopay','neo-exchange']){
  assert.equal(resolveNeoBitcoinCapability({scope:'apps',id,capability:'bitcoin.observe'}).allowed,true)
  assert.equal(resolveNeoBitcoinCapability({scope:'apps',id,capability:'bvm.validate'}).allowed,false)
 }
})
test('education and passive services do not gain Bitcoin privileges',()=>{
 for(const id of ['gisd','neo-tv','noogle']){
  assert.equal(resolveNeoBitcoinCapability({scope:'apps',id,capability:'bitcoin.observe'}).allowed,false)
 }
})
test('only isolated vm-regtest workstream may request VM validation',()=>{
 const result=resolveNeoBitcoinCapability({scope:'workstreams',id:'neo-vm',capability:'bvm.validate'})
 assert.equal(result.route,'NEO_PRIVATE_VM_REGTEST_ONLY')
 assert.equal(result.broadcastEnabled,false)
 assert.equal(result.mainnetVmEnabled,false)
 assert.equal(resolveNeoBitcoinCapability({scope:'workstreams',id:'counterparty',capability:'bvm.validate'}).allowed,false)
})
test('drift check flags unclassified applications',()=>{
 const a=auditNeoBitcoinRegistry({apps:['new-app'],systems:[]})
 assert.equal(a.ok,false)
 assert.deepEqual(a.missingApps,['new-app'])
})
