import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {serviceRegistry,findService,formatService,serviceStatus,serviceRead,handleServicesCommand} from '../core/service-registry.js'

const registry=JSON.parse(fs.readFileSync(new URL('../registry/services.json',import.meta.url),'utf8'))
const normalization=JSON.parse(fs.readFileSync(new URL('../../../architecture/neo-services-normalization.json',import.meta.url),'utf8'))
const pages=JSON.parse(fs.readFileSync(new URL('../../../architecture/neo-pages-routes.json',import.meta.url),'utf8'))

test('registry follows three-plane standard and covers every app',()=>{
  assert.deepEqual(registry.planes,{backend:'github',frontend:'github-pages',serverApi:'discord'})
  const ids=new Set(registry.services.map(x=>x.id))
  for(const app of normalization.apps)assert.ok(ids.has(app.id),`missing app ${app.id}`)
  assert.equal(ids.size,registry.services.length,'duplicate service ids')
})

test('public Pages services use registered canonical paths',()=>{
  const pagePaths=new Set(pages.routes.map(x=>x.path))
  for(const service of registry.services.filter(x=>x.pagesPath))assert.ok(pagePaths.has(service.pagesPath)||service.id==='neo-guardian',`unregistered Pages path ${service.id}:${service.pagesPath}`)
})

test('runtime registry matches machine registry',()=>{
  const runtime=serviceRegistry()
  assert.deepEqual(runtime,registry.services)
  assert.equal(findService('NEOPAY')?.id,'neopay')
  assert.match(formatService(findService('neo-relations')),/\/relations/)
  assert.match(formatService(findService('neo-prime')),/\/neo/)
  assert.match(formatService(findService('neopay')),/action:read/)
})

test('registry remains fail-closed for sensitive Discord operations',()=>{
  assert.equal(registry.rules.discordSensitiveExecution,false)
  assert.equal(registry.rules.discordApproval,false)
  assert.equal(registry.rules.aiApproval,false)
  assert.equal(registry.rules.transportOwnsBusinessLogic,false)
  assert.equal(registry.rules.readAdaptersMayMutate,false)
  assert.equal(registry.rules.readAdaptersMayExposeProtectedRelationsData,false)
  assert.equal(registry.readActions.read.mutates,false)
})

test('status API reports only grounded GitHub and Pages reachability',async()=>{
  const calls=[]
  const fetchImpl=async(url,init={})=>{
    calls.push({url:String(url),method:init.method||'GET'})
    if(String(url).includes('api.github.com'))return new Response(JSON.stringify({type:'dir'}),{status:200,headers:{'content-type':'application/json'}})
    if(String(url).includes('github.io'))return new Response('<html></html>',{status:200,headers:{'content-type':'text/html'}})
    return new Response('not found',{status:404})
  }
  const out=await serviceStatus(findService('neopay'),{}, {fetchImpl})
  assert.match(out,/GitHub backend: AVAILABLE \(dir\)/)
  assert.match(out,/GitHub Pages frontend: AVAILABLE/)
  assert.match(out,/Status scope: repository path \+ published frontend reachability only/)
  assert.match(out,/Mutations \/ approvals \/ sensitive execution: disabled/)
  assert.equal(calls.length,2)
  assert.equal(calls.every(x=>x.method==='GET'),true)
})

test('NEOpay read adapter reports router snapshot counts only',async()=>{
  const fetchImpl=async url=>{
    const u=String(url)
    if(u.endsWith('/api/router/providers.json'))return new Response(JSON.stringify({providers:[{id:'a'},{id:'b'}]}),{status:200,headers:{'content-type':'application/json'}})
    if(u.endsWith('/api/router/state.json'))return new Response(JSON.stringify({providers:{a:{healthy:true},b:{healthy:false}}}),{status:200,headers:{'content-type':'application/json'}})
    return new Response('{}',{status:404})
  }
  const out=await serviceRead(findService('neopay'),{}, {fetchImpl})
  assert.match(out,/Configured providers: 2/)
  assert.match(out,/1 healthy · 1 unhealthy/)
  assert.match(out,/transaction execution: disabled/)
})

test('NEOscan and NEO Counter read adapters tolerate sparse snapshots',async()=>{
  const fetchImpl=async url=>{
    const u=String(url)
    if(u.includes('/api/neoscan/statements/index.json'))return new Response(JSON.stringify({statements:[1,2,3],generated_at:'2026-08-29T20:00:00Z'}),{status:200,headers:{'content-type':'application/json'}})
    if(u.includes('/api/neo-counter/runtime.json'))return new Response(JSON.stringify({status:'ready'}),{status:200,headers:{'content-type':'application/json'}})
    if(u.includes('/api/neo-counter/build.json'))return new Response(JSON.stringify({commit:'abc123'}),{status:200,headers:{'content-type':'application/json'}})
    return new Response('{}',{status:404})
  }
  assert.match(await serviceRead(findService('neoscan'),{}, {fetchImpl}),/statements: 3/)
  const counter=await serviceRead(findService('neo-counter'),{}, {fetchImpl})
  assert.match(counter,/status=ready/)
  assert.match(counter,/commit=abc123/)
})

test('NEO Exchange read adapter refuses to infer market-feed health',async()=>{
  const fetchImpl=async()=>new Response(JSON.stringify({status:'published'}),{status:200,headers:{'content-type':'application/json'}})
  const out=await serviceRead(findService('neo-exchange'),{}, {fetchImpl})
  assert.match(out,/status=published/)
  assert.match(out,/Market-feed health: not inferred/)
})

test('NEO Relations read adapter does not expose protected queue counts',async()=>{
  const fetchImpl=async()=>new Response(JSON.stringify([{name:'server.js',type:'file'},{name:'README.md',type:'file'}]),{status:200,headers:{'content-type':'application/json'}})
  const out=await serviceRead(findService('neo-relations'),{}, {fetchImpl})
  assert.match(out,/Runtime files visible in source tree: 2/)
  assert.match(out,/Queue \/ approval counts: not published/)
  assert.match(out,/performs no protected-data reads/)
})

test('/services action read uses service-specific adapter',async()=>{
  const interaction={data:{options:[{name:'service',value:'neo-exchange'},{name:'action',value:'read'}]}}
  const fetchImpl=async()=>new Response(JSON.stringify({mode:'public'}),{status:200,headers:{'content-type':'application/json'}})
  const out=await handleServicesCommand(interaction,{}, {fetchImpl})
  assert.match(out,/NEO Exchange — Grounded Read Adapter/)
  assert.match(out,/mode=public/)
})
