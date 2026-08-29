import test from 'node:test';
import assert from 'node:assert/strict';
import { BotRegistry, NeoBotRuntime } from './runtime.mjs';
import { NEO_BANK_BOT, createNeoBankHandler, createStubCesAdapter } from './bank-bot.mjs';

test('bank bot read-only review executes without approval', async () => {
  const registry = new BotRegistry();
  registry.register(NEO_BANK_BOT);
  const runtime = new NeoBotRuntime({ registry });
  runtime.attach(NEO_BANK_BOT.id, createNeoBankHandler({ cesAdapter: createStubCesAdapter() }));

  const response = await runtime.execute(NEO_BANK_BOT.id, {
    action: 'ces.transactions.review',
    risk: 'read-only',
    payload: { transactionId: 'tx-1' },
  });

  assert.equal(response.status, 'completed');
  assert.equal(response.result.mode, 'stub');
});

test('bank bot value movement requires human approval', async () => {
  const registry = new BotRegistry();
  registry.register(NEO_BANK_BOT);
  const runtime = new NeoBotRuntime({ registry });
  runtime.attach(NEO_BANK_BOT.id, createNeoBankHandler({ cesAdapter: createStubCesAdapter() }));

  const pending = await runtime.execute(NEO_BANK_BOT.id, {
    action: 'ces.vdollars.issue',
    risk: 'value-movement',
    payload: { amount: 100 },
  });

  assert.equal(pending.status, 'approval_required');
  const approved = runtime.approvals.resolve(pending.approval.id, { decision: 'approved', actor: 'admin' });
  assert.equal(approved.status, 'approved');

  const response = await runtime.execute(NEO_BANK_BOT.id, {
    action: 'ces.vdollars.issue',
    risk: 'value-movement',
    payload: { amount: 100 },
  }, { approval: pending.approval.id, actor: 'admin' });

  assert.equal(response.status, 'completed');
});

test('bank bot blocks issuance above configured policy limit', async () => {
  const registry = new BotRegistry();
  registry.register(NEO_BANK_BOT);
  const runtime = new NeoBotRuntime({ registry });
  runtime.attach(NEO_BANK_BOT.id, createNeoBankHandler({ cesAdapter: createStubCesAdapter() }));

  const pending = await runtime.execute(NEO_BANK_BOT.id, {
    action: 'ces.vdollars.issue',
    risk: 'value-movement',
    payload: { amount: 10001 },
  });
  runtime.approvals.resolve(pending.approval.id, { decision: 'approved', actor: 'admin' });

  await assert.rejects(
    runtime.execute(NEO_BANK_BOT.id, {
      action: 'ces.vdollars.issue',
      risk: 'value-movement',
      payload: { amount: 10001 },
    }, { approval: pending.approval.id, actor: 'admin' }),
    /exceeds bot policy limit/,
  );
});
