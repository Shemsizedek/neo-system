import assert from 'node:assert/strict'
import test from 'node:test'
import {runApprovedCampaign} from './neo-social-campaign-runner.mjs'
import {createMemorySocialAutomationStore} from '../../server/neo-router/social-automation-store.mjs'

const payload={schema:'neo.social.nomni.v0.1',contentLane:'nomni_ausarian',contentId:'NOMNI-T1',caption:'caption',media:{imageUrl:'https://example.com/a.png',altText:'alt'},provenance:{sourceVersion:'1'},destinations:['facebook'],worldBulletin:false,approval:{required:true,class:'B-with-fixed-template'}}

test('requires approval',async()=>{
  await assert.rejects(()=>runApprovedCampaign(payload,{},createMemorySocialAutomationStore(),{resolveAccounts:async()=>[{accountId:'1'}]}),/publication_approval_required/)
})

test('persists and replays receipt without duplicate publish',async()=>{
  const store=createMemorySocialAutomationStore(); let calls=0
  const runtime={isAvailable:async()=>true,execute:async()=>{calls++;return {success:true,accountId:'1',id:'post-1'}}}
  const opts={approvalGranted:true,resolveAccounts:async()=>[{accountId:'1'}]}
  const first=await runApprovedCampaign(payload,runtime,store,opts)
  const second=await runApprovedCampaign(payload,runtime,store,opts)
  assert.equal(calls,1)
  assert.equal(first.receipts[0].status,'published')
  assert.equal(second.receipts[0].replayed,true)
})

test('account id participates in idempotency',async()=>{
  const store=createMemorySocialAutomationStore(); let calls=0
  const runtime={isAvailable:async()=>true,execute:async(_p,job)=>{calls++;return {success:true,accountId:job.accountId,id:`post-${job.accountId}`}}}
  const r=await runApprovedCampaign(payload,runtime,store,{approvalGranted:true,resolveAccounts:async()=>[{accountId:'1'},{accountId:'2'}]})
  assert.equal(calls,2); assert.equal(r.receipts.length,2)
})
