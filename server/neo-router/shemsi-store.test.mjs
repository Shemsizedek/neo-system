import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryShemsiStore,makeInboxItem,makeDraft,approveDraft} from './shemsi-store.mjs';
import {publishLinkedInReply,publishYouTubeReply,createShemsiReplyPublisher} from '../../src/social/shemsi-reply-publisher.mjs';

test('memory store keeps inbox and approved drafts by subject',async()=>{
  const store=createMemoryShemsiStore();
  const item=makeInboxItem({platform:'linkedin',accountId:'a1',commentId:'c1',parentContentId:'urn:li:activity:1',commentText:'Hello'});
  await store.putInbox('user-1',item);
  const draft=approveDraft(makeDraft({inboxItem:item,responseText:'Thanks for the comment.'}),{approvedBy:'user-1'});
  await store.putDraft('user-1',draft);
  assert.equal((await store.listInbox('user-1')).length,1);
  assert.equal((await store.getDraft('user-1',draft.id)).status,'approved');
  assert.equal((await store.listInbox('user-2')).length,0);
});

test('linkedin nested reply uses parentComment and actor',async()=>{
  let seen;
  const result=await publishLinkedInReply({parentContentId:'urn:li:activity:10',targetCommentId:'99',text:'Reply'},{accessToken:'token',actorUrn:'urn:li:organization:24',fetchImpl:async(url,init)=>{seen={url,init};return {ok:true,status:201,headers:{get:()=>null},json:async()=>({id:'reply-1'})}}});
  const body=JSON.parse(seen.init.body);
  assert.match(body.parentComment,/urn:li:comment/);
  assert.equal(body.actor,'urn:li:organization:24');
  assert.equal(result.platformPostId,'reply-1');
});

test('youtube reply uses comments.insert shape',async()=>{
  let seen;
  const result=await publishYouTubeReply({targetCommentId:'parent-1',text:'Reply'},{accessToken:'token',fetchImpl:async(url,init)=>{seen={url,init};return {ok:true,status:200,json:async()=>({id:'yt-reply-1'})}}});
  assert.match(seen.url,/youtube\/v3\/comments\?part=snippet/);
  assert.deepEqual(JSON.parse(seen.init.body),{snippet:{parentId:'parent-1',textOriginal:'Reply'}});
  assert.equal(result.status,'published');
});

test('unsupported provider fails closed without pretending publication',async()=>{
  const publish=createShemsiReplyPublisher({env:{}});
  const result=await publish({destination:'facebook',approval:{status:'approved'}});
  assert.equal(result.published,false);
  assert.equal(result.status,'adapter-not-configured');
});


test('approval is immutable and snapshots the reviewed response',()=>{
  const item=makeInboxItem({platform:'linkedin',accountId:'a1',commentId:'c2',parentContentId:'urn:li:activity:2',commentText:'Hi'});
  const pending=makeDraft({inboxItem:item,responseText:'Reviewed text'});
  const approved=approveDraft(pending,{approvedBy:'user-1',approvedAt:'2026-09-26T19:00:00.000Z'});
  const retry=approveDraft(approved,{approvedBy:'user-2',approvedAt:'2026-09-26T20:00:00.000Z'});
  assert.equal(approved.approvedResponseText,'Reviewed text');
  assert.equal(retry.approvedBy,'user-1');
  assert.equal(retry.approvedAt,'2026-09-26T19:00:00.000Z');
});
