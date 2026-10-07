import test from 'node:test'
import assert from 'node:assert/strict'
import {once} from 'node:events'
import {createTokenworksServer} from './server.mjs'

async function withServer(crownAuthorizer,fn){
  let escrowCalls=0,leaseCalls=0,revokeCalls=0
  const tokenworks={
    capabilities:()=>({}),
    issueAddressChallenge:()=>({}),
    grantSharedAccess:body=>{leaseCalls++;return{id:'lease-1',...body}},
    revokeSharedAccess:id=>{revokeCalls++;return{id,status:'revoked'}},
    composeEscrowPlan:body=>{escrowCalls++;return{id:'escrow-1',...body}}
  }
  const server=createTokenworksServer({tokenworks,crownAuthorizer})
  server.listen(0,'127.0.0.1');await once(server,'listening')
  try{await fn(`http://127.0.0.1:${server.address().port}`,()=>({escrowCalls,leaseCalls,revokeCalls}))}
  finally{server.close();await once(server,'close')}
}

test('TokenPass activation fails closed before lease mutation',async()=>{
  await withServer(async(service,scope)=>{assert.equal(service,'tokenpass');assert.equal(scope,'tokenpass.activate');return{verified:false,error:'crown_capability_denied'}},async(base,calls)=>{
    const r=await fetch(base+'/api/v1/neopass/leases',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})
    assert.equal(r.status,403)
    assert.equal(calls().leaseCalls,0)
  })
})

test('TokenPass revoke requires revoke capability',async()=>{
  await withServer(async(service,scope)=>{assert.equal(service,'tokenpass');assert.equal(scope,'tokenpass.revoke.request');return{verified:true}},async(base,calls)=>{
    const r=await fetch(base+'/api/v1/neopass/leases/lease-1/revoke',{method:'POST'})
    assert.equal(r.status,200)
    assert.equal(calls().revokeCalls,1)
  })
})

test('TokenWorks escrow planning requires asset.prepare capability',async()=>{
  await withServer(async(service,scope)=>{assert.equal(service,'neo-tokenworks');assert.equal(scope,'tokenworks.asset.prepare');return{verified:true}},async(base,calls)=>{
    const r=await fetch(base+'/api/v1/tokenworks/escrow-plans',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({asset:'NOMNI'})})
    assert.equal(r.status,201)
    assert.equal(calls().escrowCalls,1)
  })
})
