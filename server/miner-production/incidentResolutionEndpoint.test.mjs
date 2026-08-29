import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import {PersistentStateStore} from './persistentStore.mjs'

const A='a'.repeat(64)
const requestJson=(port,pathName,body)=>new Promise((resolve,reject)=>{const raw=JSON.stringify(body);const req=http.request({host:'127.0.0.1',port,path:pathName,method:'POST',headers:{authorization:'Bearer test-token','content-type':'application/json','content-length':Buffer.byteLength(raw)}},res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>{let parsed={};try{parsed=text?JSON.parse(text):{}}catch{}resolve({status:res.statusCode,body:parsed})})});req.on('error',reject);req.end(raw)})

test('incident endpoint verifies with Bitcoin Core and persists evidence before release',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'neo-incident-endpoint-')),db=path.join(dir,'state.sqlite')
 const seed=new PersistentStateStore(db)
 seed.put('payout','P-1',{id:'P-1',customerId:'C-1',state:'BROADCAST',txid:A,amountBtc:0.01},{action:'TEST_SEED'})
 seed.put('recovery_incident','INC-1',{id:'INC-1',payoutId:'P-1',state:'OPEN',reason:'CHAIN_LOOKUP_AMBIGUOUS',severity:'HIGH',manualResolutionAllowed:true},{action:'TEST_SEED'})
 seed.close()
 process.env.NEO_MINER_DB_PATH=db;process.env.NEO_MINER_API_TOKEN='test-token';process.env.BITCOIN_WALLET_RPC_URL='http://bitcoin-core.test';process.env.BITCOIN_WALLET_RPC_AUTH='rpcuser:rpcpass'
 const originalFetch=globalThis.fetch
 globalThis.fetch=async(_url,options)=>{const call=JSON.parse(String(options?.body||'{}'));let result=null;if(call.method==='gettransaction')result={txid:A,confirmations:3,blockhash:'block-1',trusted:true,abandoned:false};return new Response(JSON.stringify({jsonrpc:'2.0',id:call.id,result,error:null}),{status:200,headers:{'content-type':'application/json'}})}
 const {server}=await import(`./server.mjs?incident-endpoint=${Date.now()}`)
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)})
 t.after(async()=>{globalThis.fetch=originalFetch;await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true})})
 const invalid=await requestJson(server.address().port,'/incidents/INC-1/resolve',{operatorId:'op-1',resolutionCode:'CHAIN_VERIFIED'})
 assert.equal(invalid.status,409);assert.match(invalid.body.error,/UNSUPPORTED/)
 const valid=await requestJson(server.address().port,'/incidents/INC-1/resolve',{operatorId:'op-1',resolutionCode:'TX_CONFIRMED',note:'Core verified'})
 assert.equal(valid.status,200);assert.equal(valid.body.incident.state,'RESOLVED');assert.equal(valid.body.incident.verifiedEvidence.verified,true)
 const inspect=new PersistentStateStore(db),evidence=inspect.get('bitcoin_incident_evidence','INC-1'),incident=inspect.get('recovery_incident','INC-1');inspect.close()
 assert.equal(evidence.resolutionCode,'TX_CONFIRMED');assert.equal(evidence.txid,A);assert.equal(incident.state,'RESOLVED');assert.equal(incident.verifiedEvidence.resolutionCode,'TX_CONFIRMED')
})
