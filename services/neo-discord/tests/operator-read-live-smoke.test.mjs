import test from 'node:test'
import assert from 'node:assert/strict'
import {runOperatorReadLiveSmoke} from '../deployment/operator-read-live-smoke.mjs'

const env={
  NEO_MINER_OPERATOR_URL:'https://miner.example/discord/snapshot',
  NEO_MINER_OPERATOR_TOKEN:'miner-token',
  NEO_RELATIONS_OPERATOR_URL:'https://relations.example/discord/pending-summary?tenantId=neo-prime',
  NEO_RELATIONS_OPERATOR_TOKEN:'relations-token'
}

function response(status,data){return {ok:status>=200&&status<300,status,text:async()=>JSON.stringify(data)}}

test('live smoke accepts read-only miner and aggregate relations responses',async()=>{
  const calls=[]
  const fetchImpl=async(url,opts)=>{calls.push({url,opts});return url.includes('miner')?response(200,{status:'READY'}):response(200,{tenantId:'neo-prime',pendingApprovals:3,readOnly:true,recordsIncluded:false})}
  const out=await runOperatorReadLiveSmoke(env,{fetchImpl})
  assert.equal(out.ok,true)
  assert.equal(out.relations.pendingApprovals,3)
  assert.equal(calls.length,2)
  assert.ok(calls.every(x=>x.opts.method==='GET'))
  assert.equal(calls[0].opts.headers.authorization,'Bearer miner-token')
  assert.equal(calls[1].opts.headers.authorization,'Bearer relations-token')
})

test('live smoke fails when Relations returns record payloads',async()=>{
  const fetchImpl=async url=>url.includes('miner')?response(200,{status:'READY'}):response(200,{pendingApprovals:1,readOnly:true,recordsIncluded:false,items:[{id:'secret'}]})
  await assert.rejects(()=>runOperatorReadLiveSmoke(env,{fetchImpl}),/RELATIONS_FORBIDDEN_FIELD_ITEMS/)
})

test('live smoke fails closed on protected endpoint HTTP errors',async()=>{
  const fetchImpl=async url=>url.includes('miner')?response(401,{error:'denied'}):response(200,{pendingApprovals:0,readOnly:true,recordsIncluded:false})
  await assert.rejects(()=>runOperatorReadLiveSmoke(env,{fetchImpl}),/MINER_MACHINE_READ_HTTP_401/)
})
