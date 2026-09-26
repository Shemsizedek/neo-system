import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RUDWAAN_TRANSPORT,
  normalizeInstagramCommentEvent,
  handleInstagramCommentEvent,
  createRudwaanInstagramHttpHandler,
} from './rudwaan-instagram-transport.mjs';

test('transport advertises only supported public interaction lane', () => {
  assert.deepEqual(RUDWAAN_TRANSPORT.supportedInbound, ['comment']);
  assert.deepEqual(RUDWAAN_TRANSPORT.supportedOutbound, ['reply_to_comment']);
  assert.equal(RUDWAAN_TRANSPORT.dmIngress, 'not_available_in_current_connected_provider');
});

test('normalizes Instagram comment event', () => {
  const e = normalizeInstagramCommentEvent({
    mediaId: 'm1',
    userId: 'u1',
    commentId: 'c1',
    message: 'What is Noology?',
  });
  assert.equal(e.type, 'comment');
  assert.equal(e.commentId, 'c1');
});

test('public comment is answered through Nous and replied publicly', async () => {
  const calls = [];
  const result = await handleInstagramCommentEvent({
    mediaId: 'm1',
    userId: 'u1',
    commentId: 'c1',
    message: 'What is Noology?',
  }, {
    queryNous: async () => ({reply: 'Noology is the disciplined study of intelligence and knowing.', provenance: ['public']}),
    replyToComment: async (x) => { calls.push(x); return {success: true, id: 'r1'}; },
  });

  assert.equal(result.status, 'replied');
  assert.equal(calls[0].commentId, 'c1');
  assert.match(calls[0].message, /Noology/);
});

test('HTTP handler fails closed on unsigned event', async () => {
  const handler = createRudwaanInstagramHttpHandler({
    verifyRequest: async () => false,
    runtimeFactory: () => ({}),
  });
  const res = await handler(new Request('https://example.test/instagram/rudwaan/events', {
    method: 'POST',
    body: JSON.stringify({}),
  }));
  assert.equal(res.status, 401);
});
