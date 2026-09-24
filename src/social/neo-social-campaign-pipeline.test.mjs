import assert from 'node:assert/strict'
import test from 'node:test'
import {buildCommonPlatformJobs, dispatchCampaignPayload, normalizeCampaignPayload} from './neo-social-campaign-pipeline.mjs'

const nomni={
  schema:'neo.social.nomni.v0.1',
  contentLane:'nomni_ausarian',
  contentId:'NOMNI-TEST-001',
  caption:'NOMNI caption',
  media:{imageUrl:'https://example.com/nomni.png',altText:'Nomni card'},
  provenance:{sourceVersion:'1.0'},
  destinations:['facebook','linkedin','youtube_community'],
  worldBulletin:false,
  approval:{required:true,class:'B-with-fixed-template'},
}

test('normalizes NOMNI into common campaign contract',()=>{
  const n=normalizeCampaignPayload(nomni)
  assert.equal(n.contentLane,'nomni_ausarian')
  assert.equal(n.sourceVersion,'1.0')
  assert.equal(n.worldBulletin,false)
})

test('daily Noocracy Report cannot route to World Bulletin',()=>{
  assert.throws(()=>normalizeCampaignPayload({...nomni,contentLane:'noocracy_report',contentId:'report:1',worldBulletin:true}),/world_bulletin_policy_mismatch/)
})

test('Omnitrix retains kill switch',()=>{
  assert.throws(()=>buildCommonPlatformJobs({
    schema:'neo.social.omnitrix.v0.2', contentLane:'omnitrix_chronicles',
    contentId:'omnitrix:2026-09-24:test', episodeDate:'2026-09-24',
    finalCaption:'Story', captions:{facebook:'Story'},
    media:{imageUrl:'https://example.com/o.png',altText:'Comic'},
    destinations:['facebook'], worldBulletin:false,
    approval:{required:true,class:'B-with-fixed-template'},
  },{env:{NEO_SOCIAL_OMNITRIX_ENABLED:'false'}}),/omnitrix_kill_switch_closed/)
})

test('dispatch requires explicit approval',async()=>{
  await assert.rejects(()=>dispatchCampaignPayload(nomni,{execute:async()=>({success:true})}),/publication_approval_required/)
})

test('dispatch uses one reusable engine and preserves submitted state',async()=>{
  const result=await dispatchCampaignPayload({...nomni,destinations:['facebook']},{
    isAvailable:async()=>true,
    execute:async()=>({success:true,accountId:'fb-page-1'})
  },{approvalGranted:true})
  assert.equal(result.receipts[0].provider,'windsor_organic')
  assert.equal(result.receipts[0].status,'submitted')
  assert.equal(result.receipts[0].contentLane,'nomni_ausarian')
})
