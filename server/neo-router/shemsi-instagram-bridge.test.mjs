import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryShemsiStore} from './shemsi-store.mjs';
import {ingestVerifiedInstagramEvent} from './shemsi-instagram-bridge.mjs';
import {buildShemsiDiscordApprovalMessage,notifyShemsiApprovalDiscord} from './shemsi-notifier.mjs';

test('verified Instagram event becomes one subject-scoped Shemsi approval item',async()=>{
  const store=createMemoryShemsiStore();
  const event={mediaId:'media-1',userId:'ig-user-2',commentId:'comment-3',message:'Tell me more',username:'reader',permalink:'https://instagram.test/p/1'};
  const first=await ingestVerifiedInstagramEvent({event,subjectId:'neo-owner',accountId:'ig-business-1',store});
  const second=await ingestVerifiedInstagramEvent({event,subjectId:'neo-owner',accountId:'ig-business-1',store});
  assert.equal(first.status,'queued');
  assert.equal(second.status,'duplicate');
  assert.equal((await store.listInbox('neo-owner')).length,1);
  assert.equal((await store.listApprovalNotices('neo-owner')).length,1);
  assert.equal((await store.listInbox('other-owner')).length,0);
});

test('Discord approval message is safe and contains the review route',()=>{
  const message=buildShemsiDiscordApprovalMessage({item:{platform:'instagram',commentText:'Question here'},notice:{priority:'normal'}});
  assert.match(message.content,/Shemsi approval needed/);
  assert.match(message.content,/shemsi-comments/);
  assert.deepEqual(message.allowed_mentions.parse,[]);
});

test('Discord notification fails closed when webhook is missing',async()=>{
  const result=await notifyShemsiApprovalDiscord({item:{},notice:{}},{webhookUrl:''});
  assert.equal(result.sent,false);
});
