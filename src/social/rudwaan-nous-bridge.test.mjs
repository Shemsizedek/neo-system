import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRudwaanEnvelope,
  classifyRudwaanIntent,
  handleRudwaanMessage,
} from './rudwaan-nous-bridge.mjs';

test('public intent remains public', () => {
  assert.deepEqual(classifyRudwaanIntent('explain_public_knowledge'), {
    intent: 'explain_public_knowledge',
    class: 'public',
  });
});

test('privileged intent fails closed to NEOsync handoff', async () => {
  let called = false;
  const response = await handleRudwaanMessage({
    conversationId: 'c1',
    userId: 'u1',
    message: 'Deploy it',
    intent: 'deploy_system',
  }, {
    queryNous: async () => { called = true; return {reply: 'should not run'}; },
  });
  assert.equal(called, false);
  assert.equal(response.status, 'handoff_required');
  assert.equal(response.handoff, 'NEOsync');
});

test('public request strips execution authority', () => {
  const envelope = buildRudwaanEnvelope({
    conversationId: 'c2',
    userId: 'u2',
    message: 'What is Noology?',
  });
  assert.equal(envelope.controls.publicOnly, true);
  assert.equal(envelope.controls.financialExecution, false);
  assert.equal(envelope.controls.publication, false);
});

test('public request is answered through Nous runtime', async () => {
  const response = await handleRudwaanMessage({
    conversationId: 'c3',
    userId: 'u3',
    message: 'What is Noology?',
  }, {
    queryNous: async (envelope) => ({
      reply: `Nous received: ${envelope.message}`,
      provenance: ['public-knowledge'],
    }),
  });
  assert.equal(response.status, 'ok');
  assert.equal(response.reply, 'Nous received: What is Noology?');
  assert.deepEqual(response.actions, []);
});
