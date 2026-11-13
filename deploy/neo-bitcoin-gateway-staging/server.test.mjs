import test from 'node:test'
import assert from 'node:assert/strict'
import {once} from 'node:events'
import {createBitcoinGatewayStagingServer} from './server.mjs'

async function probe(fn){
  const server=createBitcoinGatewayStagingServer({now:()=> '2026-10-29T00:00:00.000Z'})
  server.listen(0,'127.0.0.1')
  await once(server,'listening')
  const url='http://127.0.0.1:'+server.address().port
  try{await fn(url)}finally{server.close();await once(server,'close')}
}
test('isolated Render shell reports no Bitcoin RPC or mainnet activity',async()=>{
  await probe(async base=>{
    const r=await fetch(base+'/healthz')
    assert.equal(r.status,200)
    const payload=await r.json()
    assert.equal(payload.bitcoinRpc,'not_configured')
    assert.equal(payload.bitcoinAccess,'disabled')
    assert.equal(payload.liveMainnet,false)
    assert.equal(r.headers.get('cache-control'),'no-store')
  })
})
test('staging shell cannot expose Bitcoin RPC, even with authorization header',async()=>{
  await probe(async base=>{
    for(const method of ['GET','POST']){
      const r=await fetch(base+'/api/v1/bitcoin/chain?scope=apps&project=neo-counter',{
        method,headers:{authorization:'Bearer fake-operator', 'x-neopass-subject':'executive'}
      })
      assert.equal(r.status,404)
      assert.deepEqual(await r.json(),{error:'not_found'})
    }
  })
})
test('unknown paths remain unavailable and no CORS wildcard is returned',async()=>{
  await probe(async base=>{
    const r=await fetch(base+'/rpc')
    assert.equal(r.status,404)
    assert.equal(r.headers.get('access-control-allow-origin'),null)
  })
})
