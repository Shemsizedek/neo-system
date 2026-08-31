import test from 'node:test'
import assert from 'node:assert/strict'
import { handleBotsReadControl } from '../core/bots-read-control.js'
import { handleBotsCommand } from '../core/bots.js'

const env={NEO_BOTS_CONTROL_TOKEN:'secret',DISCORD_OPERATOR_USER_IDS:'327352249758253057'}

function interaction(action,extra={}){
  return {guild_id:'guild-1',member:{user:{id:'327352249758253057'},roles:[]},data:{options:[{name:'action',value:action},...Object.entries(extra).map(([name,value])=>({name,value}))]}}
}

test('read-only control requires bearer token and operator id',async()=>{
  const denied=await handleBotsReadControl(new Request('https://neo.example/neo-bots/control/approvals',{headers:{authorization:'Bearer secret','x-neo-actor':'other'}}),env)
  assert.equal(denied.status,403)
  const accepted=await handleBotsReadControl(new Request('https://neo.example/neo-bots/control/approvals',{headers:{authorization:'Bearer secret','x-neo-actor':'327352249758253057'}}),env)
  assert.equal(accepted.status,200)
  assert.deepEqual((await accepted.json()).approvals,[])
})

test('announcement evidence remains read-only on Discord bridge',async()=>{
  const response=await handleBotsReadControl(new Request('https://neo.example/neo-bots/control/announcement-evidence',{method:'POST',headers:{authorization:'Bearer secret','x-neo-actor':'327352249758253057','content-type':'application/json'},body:JSON.stringify({text:'Book Entry: Credit Voucher: CV-10 CES Transaction ID: TX-10 SELLER: WORLD CREDIT UNION – NMNI0260'})}),env)
  assert.equal(response.status,200)
  const body=await response.json()
  assert.equal(body.evidence.state,'TV-1')
  assert.equal(body.cesWriteExecuted,false)
})

test('approval writes are disabled on Discord read bridge',async()=>{
  const response=await handleBotsReadControl(new Request('https://neo.example/neo-bots/control/approvals/a1',{method:'POST',headers:{authorization:'Bearer secret','x-neo-actor':'327352249758253057'}}),env)
  assert.equal(response.status,405)
})

test('bots command preserves nested control base path',async()=>{
  let requested=''
  const fetchImpl=async(url)=>{requested=String(url);return new Response(JSON.stringify({approvals:[]}),{status:200,headers:{'content-type':'application/json'}})}
  const text=await handleBotsCommand(interaction('pending'),{...env,NEO_BOTS_CONTROL_URL:'https://neo.example/neo-bots/control/'},{fetchImpl})
  assert.equal(text,'NEO Bots: no pending approvals.')
  assert.equal(requested,'https://neo.example/neo-bots/control/approvals')
})
