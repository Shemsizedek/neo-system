import test from 'node:test';
import assert from 'node:assert/strict';
import {triageComment,fetchLinkedInComments,fetchYouTubeCommentThreads,filterOwnComments,readBackYouTubeReply} from './shemsi-ingestion.mjs';

test('triage marks questions and complaints',()=>{
  assert.equal(triageComment({commentText:'How does this work?'}).triage.disposition,'reply-recommended');
  assert.equal(triageComment({commentText:'This is broken and I am upset'}).triage.priority,'high');
});

test('filters own platform identities',()=>{
  const items=[
    {platform:'linkedin',accountId:'urn:li:organization:24'},
    {platform:'linkedin',accountId:'urn:li:person:2'},
    {platform:'youtube',accountId:'UCOWN'},
    {platform:'youtube',accountId:'UCOTHER'},
  ];
  const result=filterOwnComments(items,{ownActorUrn:'urn:li:organization:24',ownYouTubeChannelId:'UCOWN'});
  assert.deepEqual(result.map(x=>x.accountId),['urn:li:person:2','UCOTHER']);
});

test('linkedin comments normalize into inbox-compatible records',async()=>{
  const items=await fetchLinkedInComments({activityUrn:'urn:li:activity:1',accessToken:'t',fetchImpl:async()=>({ok:true,json:async()=>({elements:[{id:'11',actor:'urn:li:person:2',message:{text:'Question?'},created:{time:1700000000000}}]})})});
  assert.equal(items[0].platform,'linkedin');
  assert.equal(items[0].commentId,'11');
});

test('youtube comment threads normalize and preserve paging',async()=>{
  const out=await fetchYouTubeCommentThreads({accessToken:'t',videoId:'v1',fetchImpl:async()=>({ok:true,json:async()=>({nextPageToken:'next',items:[{snippet:{videoId:'v1',topLevelComment:{id:'c1',snippet:{authorChannelId:{value:'UC2'},authorDisplayName:'A',textDisplay:'Hello',publishedAt:'2026-09-26T10:00:00Z'}}}}]})})});
  assert.equal(out.comments[0].commentId,'c1');
  assert.equal(out.nextPageToken,'next');
});

test('youtube readback distinguishes present from absent replies',async()=>{
  const yes=await readBackYouTubeReply({commentId:'r1',accessToken:'t',fetchImpl:async()=>({ok:true,json:async()=>({items:[{id:'r1'}]})})});
  const no=await readBackYouTubeReply({commentId:'r1',accessToken:'t',fetchImpl:async()=>({ok:true,json:async()=>({items:[]})})});
  assert.equal(yes.verified,true);assert.equal(no.verified,false);
});
