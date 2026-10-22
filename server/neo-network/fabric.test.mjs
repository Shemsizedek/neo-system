import test from 'node:test'
import assert from 'node:assert/strict'
import {createNetworkRegistry,buildPeerPlan,buildDnsZone,routeWithFailover,networkSnapshot,renderWireGuardConfig} from './fabric.mjs'

const node=(id,key,endpoint)=>({node_id:id,public_key:key,attested:true,endpoint})

test('only attested nodes enroll and receive unique overlay addresses',()=>{
  const r=createNetworkRegistry()
  assert.throws(()=>r.enrollNode({node_id:'bad',public_key:'k',attested:false}),/attested_node_identity_required/)
  const a=r.enrollNode(node('a','key-a','198.51.100.1:51820')),b=r.enrollNode(node('b','key-b','198.51.100.2:51820'))
  assert.notEqual(a.overlay_ip,b.overlay_ip)
})

test('service discovery returns healthy eligible endpoint',()=>{
  const r=createNetworkRegistry()
  r.enrollNode(node('a','key-a','198.51.100.1:51820'))
  r.registerService({service_id:'neo-storage',node_id:'a',port:8799})
  const x=r.resolveService('neo-storage')
  assert.equal(x.state,'RESOLVED')
  assert.equal(x.selected.name,'neo-storage.estate.neo')
})

test('health-aware routing fails over to next endpoint',()=>{
  const r=createNetworkRegistry()
  r.enrollNode(node('a','key-a','198.51.100.1:51820'))
  r.enrollNode(node('b','key-b','198.51.100.2:51820'))
  r.registerService({service_id:'neo-storage',node_id:'a',port:8799,priority:10})
  r.registerService({service_id:'neo-storage',node_id:'b',port:8799,priority:20})
  assert.equal(r.resolveService('neo-storage').selected.node_id,'a')
  const x=routeWithFailover({serviceId:'neo-storage',registry:r,failedNodeId:'a'})
  assert.equal(x.selected.node_id,'b')
})

test('peer plan stores fingerprints, never private keys',()=>{
  const r=createNetworkRegistry()
  r.enrollNode(node('a','public-a','198.51.100.1:51820'))
  r.enrollNode(node('b','public-b','198.51.100.2:51820'))
  const plan=buildPeerPlan(r.nodes())
  assert.equal(JSON.stringify(plan).includes('private'),false)
  assert.ok(plan[0].peers.length===1)
})

test('network snapshot includes internal dns and estate identity',()=>{
  const r=createNetworkRegistry()
  r.enrollNode(node('a','key-a','198.51.100.1:51820'))
  r.registerService({service_id:'neo-compute',node_id:'a',port:8798})
  const snap=networkSnapshot(r)
  assert.equal(snap.estate,'Global Vast Estate')
  assert.equal(buildDnsZone({services:r.services()}).records[0].value,r.node('a').overlay_ip)
})

test('wireguard config references runtime private key and attested peers',()=>{
  const r=createNetworkRegistry()
  const a=r.enrollNode(node('a','public-a','198.51.100.1:51820'))
  r.enrollNode(node('b','public-b','198.51.100.2:51820'))
  const config=renderWireGuardConfig({node:a,peerPlan:buildPeerPlan(r.nodes())})
  assert.match(config,/PrivateKey = <runtime-secret:/)
  assert.match(config,/expected fingerprint:/)
  assert.equal(config.includes('public-a'),false)
})
