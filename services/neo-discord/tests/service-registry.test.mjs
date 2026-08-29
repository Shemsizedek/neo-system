import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {serviceRegistry,findService,formatService,serviceStatus,serviceRead,operatorRead,handleServicesCommand} from '../core/service-registry.js'
import {isDiscordOperator} from '../core/authorization.js'

const registry=JSON.parse(fs.readFileSync(new URL('../registry/services.json',import.meta.url),'utf8'))
const normalization=JSON.parse(fs.readFileSync(new URL('../../../architecture/neo-services-normalization.json',import.meta.url),'utf8'))
const pages=JSON.parse(fs.readFileSync(new URL('../../../architecture/neo-pages-routes.json',import.meta.url),'utf8'))

test('registry follows three-plane standard and covers every app',()=>{
  assert.deepEqual(registry.planes,{backend:'github',frontend:'github-pages',serverApi:'discord'})
  const ids=new Set(registry.services.map(x=>x.id))
  for(const app of normalization.apps)assert.ok(ids.has(app.id),`missing app ${app.id}`)
  assert.equal(ids.size,registry.services.length,'duplicate service ids')
  assert.equal(findService('neo-miner')?.visibility,'operator')
})

test('public Pages services use registered canonical paths',()=>{
  const pagePaths=new Set(pages.routes.map(x=>x.path))
  for(const service of registry.services.filter(x=>x.pagesPath))assert.ok(pagePaths.has(service.pagesPath)||service.id==='neo-guardian',`unregistered Pages path ${service.id}:${service.pagesPath}`)
})

test('runtime registry matches machine registry',()=>{
  const runtime=serviceRegistry()
  assert.deepEqual(runtime,registry.services)
  assert.equal(findService('NEOPAY')?.id,'neopay')
  assert.match(formatService(findService('neo-relations')),/action:operator/)
  assert.match(formatService(findService('neo-miner')),/action:operator/)
})

test('registry remains fail-closed for sensitive Discord operations',()=>{
  assert.equal(registry.rules.discordSensitiveExecution,false)
  assert.equal(registry.rules.discordApproval,false)
  assert.equal(registry.rules.aiApproval,false)
  assert.equal(registry.rules.transportOwnsBusinessLogic,false)
  assert.equal(registry.rules.readAdaptersMayMutate,false)
  assert.equal(registry.rules.readAdaptersMayExposeProtectedRelationsData,false)
  assert.equal(registry.rules.operatorReadRequiresRbac,true)
  assert.equal(registry.rules.operatorReadMutation,false)
  assert.equal(registry.rules.operatorReadMayExposeSecrets,false)
  assert.equal(registry.rules.operatorReadMayApprove,false)
  assert.equal(registry.rules.operatorReadPublicFallback,false)
  assert.equal(registry.readActions.operator.mutates,false)
  assert.equal(registry.readActions.operator.requiresOperator,true)
})

test('operator RBAC fails closed and accepts configured user or role',()=>{
  const user={guild_id:'g1',member:{user:{id:'u1'},roles:['r1']}}
  assert.equal(isDiscordOperator(user,{}),false)
  assert.equal(isDiscordOperator(user,{DISCORD_OPERATOR_USER_IDS:'u1'}),true)
  assert.equal(isDiscordOperator(user,{DISCORD_OPERATOR_ROLE_IDS:'r1,r2'}),true)
  assert.equal(isDiscordOperator(user,{DISCORD_OPERATOR_USER_IDS:'u2',DISCORD_OPERATOR_ROLE_IDS:'r2'}),false)
})

test('status API reports only grounded GitHub and Pages reachability',async()=>{
  const calls=[]
  const fetchImpl=async(url,init={})=>{calls.push({url:String(url),method:init.method||'GET'});if(String(url).includes('api.github.com'))return new Response(JSON.stringify({type:'dir'}),{status:200,headers:{'content-type':'application/json'}});if(String(url).includes('github.io'))return new Response('<html></html>',{status:200,headers:{'content-type':'text/html'}});return new Response('not found',{status:404})}
  const out=await serviceStatus(findService('neopay'),{}, {fetchImpl})
  assert.match(out,/GitHub backend: AVAILABLE \(dir\)/)
  assert.match(out,/GitHub Pages frontend: AVAILABLE/)
  assert.equal(calls.every(x=>x.method==='GET'),true)
})

test('service read adapters remain read-only',async()=>{
  const fetchImpl=async url=>{const u=String(url);if(u.endsWith('/api/router/providers.json'))return new Response(JSON.stringify({providers:[{id:'a'},{id:'b'}]}),{status:200,headers:{'content-type':'application/json'}});if(u.endsWith('/api/router/state.json'))return new Response(JSON.stringify({providers:{a:{healthy:true},b:{healthy:false}}}),{status:200,headers:{'content-type':'application/json'}});if(u.includes('/api/neoscan/statements/index.json'))return new Response(JSON.stringify({statements:[1,2,3]}),{status:200,headers:{'content-type':'application/json'}});if(u.includes('/api/neo-counter/runtime.json'))return new Response(JSON.stringify({status:'ready'}),{status:200,headers:{'content-type':'application/json'}});if(u.includes('/api/neo-counter/build.json'))return new Response(JSON.stringify({commit:'abc123'}),{status:200,headers:{'content-type':'application/json'}});if(u.includes('/api/platforms/neo-exchange.json'))return new Response(JSON.stringify({status:'published'}),{status:200,headers:{'content-type':'application/json'}});return new Response(JSON.stringify([{name:'server.js',type:'file'}]),{status:200,headers:{'content-type':'application/json'}})}
  assert.match(await serviceRead(findService('neopay'),{}, {fetchImpl}),/Configured providers: 2/)
  assert.match(await serviceRead(findService('neoscan'),{}, {fetchImpl}),/statements: 3/)
  assert.match(await serviceRead(findService('neo-counter'),{}, {fetchImpl}),/status=ready/)
  assert.match(await serviceRead(findService('neo-exchange'),{}, {fetchImpl}),/Market-feed health: not inferred/)
  assert.match(await serviceRead(findService('neo-relations'),{}, {fetchImpl}),/performs no protected-data reads/)
})

test('unauthorized operator read never calls protected source',async()=>{
  let calls=0
  const interaction={guild_id:'g1',member:{user:{id:'u1'},roles:[]}}
  const out=await operatorRead(findService('neo-miner'),interaction,{NEO_MINER_OPERATOR_URL:'https://miner.example/snapshot',NEO_MINER_OPERATOR_TOKEN:'secret'},{fetchImpl:async()=>{calls++;return new Response('{}',{status:200})}})
  assert.match(out,/NOT AUTHORIZED/)
  assert.match(out,/No protected source was queried/)
  assert.equal(calls,0)
})

test('operator read refuses public fallback when runtime config is absent',async()=>{
  let calls=0
  const interaction={guild_id:'g1',member:{user:{id:'u1'},roles:['ops']}}
  const out=await operatorRead(findService('neo-relations'),interaction,{DISCORD_OPERATOR_ROLE_IDS:'ops'},{fetchImpl:async()=>{calls++;return new Response('{}',{status:200})}})
  assert.match(out,/NOT CONFIGURED/)
  assert.match(out,/No public fallback was used/)
  assert.equal(calls,0)
})

test('authorized miner operator read is GET-only, bearer-authenticated, and never echoes token',async()=>{
  const calls=[]
  const token='top-secret-token'
  const interaction={guild_id:'g1',member:{user:{id:'u1'},roles:['ops']}}
  const env={DISCORD_OPERATOR_ROLE_IDS:'ops',NEO_MINER_OPERATOR_URL:'https://miner.example/snapshot',NEO_MINER_OPERATOR_TOKEN:token}
  const fetchImpl=async(url,init={})=>{calls.push({url:String(url),method:init.method,auth:init.headers?.authorization});return new Response(JSON.stringify({status:'UP',mode:'LIVE',incidents:{open:2}}),{status:200,headers:{'content-type':'application/json'}})}
  const out=await operatorRead(findService('neo-miner'),interaction,env,{fetchImpl})
  assert.equal(calls.length,1)
  assert.equal(calls[0].method,'GET')
  assert.equal(calls[0].auth,`Bearer ${token}`)
  assert.match(out,/status=UP/)
  assert.match(out,/open=2/)
  assert.match(out,/payout holds cannot be acknowledged or released here/)
  assert.equal(out.includes(token),false)
})

test('relations operator read renders aggregate counts only and excludes PII payloads',async()=>{
  const interaction={guild_id:'g1',member:{user:{id:'u1'},roles:[]}}
  const env={DISCORD_OPERATOR_USER_IDS:'u1',NEO_RELATIONS_OPERATOR_URL:'https://relations.example/intents?status=pending_approval',NEO_RELATIONS_OPERATOR_TOKEN:'secret'}
  const body={items:[{id:'i1',name:'Sensitive Name',email:'private@example.com'},{id:'i2',payload:{secret:'x'}}],queueDepth:7,totalContacts:42,updatedAt:'2026-08-29T20:00:00Z'}
  const out=await operatorRead(findService('neo-relations'),interaction,env,{fetchImpl:async()=>new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}})})
  assert.match(out,/pendingApprovals=2/)
  assert.match(out,/queueDepth=7/)
  assert.match(out,/totalContacts=42/)
  assert.match(out,/aggregate-only/)
  assert.equal(out.includes('Sensitive Name'),false)
  assert.equal(out.includes('private@example.com'),false)
  assert.equal(out.includes('secret'),false)
})

test('/services action operator routes through protected adapter',async()=>{
  const interaction={guild_id:'g1',member:{user:{id:'u1'},roles:['ops']},data:{options:[{name:'service',value:'neo-miner'},{name:'action',value:'operator'}]}}
  const env={DISCORD_OPERATOR_ROLE_IDS:'ops',NEO_MINER_OPERATOR_URL:'https://miner.example/snapshot',NEO_MINER_OPERATOR_TOKEN:'secret'}
  const out=await handleServicesCommand(interaction,env,{fetchImpl:async()=>new Response(JSON.stringify({mode:'READY'}),{status:200,headers:{'content-type':'application/json'}})})
  assert.match(out,/NEO Miner — Protected Operator Read/)
  assert.match(out,/mode=READY/)
})

test('command manifest exposes operator read without mutation commands',()=>{
  const command=JSON.parse(fs.readFileSync(new URL('../commands/services.json',import.meta.url),'utf8'))
  const action=command.options.find(x=>x.name==='action')
  const values=new Set(action.choices.map(x=>x.value))
  assert.ok(values.has('operator'))
  assert.equal(values.has('approve'),false)
  assert.equal(values.has('execute'),false)
  assert.equal(command.options.find(x=>x.name==='service').choices.some(x=>x.value==='neo-miner'),true)
})
