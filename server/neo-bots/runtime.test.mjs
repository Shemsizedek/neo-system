import test from 'node:test';
import assert from 'node:assert/strict';
import { BotRegistry, NeoBotRuntime } from './runtime.mjs';
import {
  NEO_BANK_BOT,
  createNeoBankHandler,
  createStubCesAdapter,
  resolveCesIdentity,
  registerCesExchange,
} from './bank-bot.mjs';

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
  assert.equal(response.result.exchange.adminAccount, 'NMNI0000');
  assert.equal(response.result.exchange.bankAccount, 'NMNIBANK');
});

test('connected CES exchanges use paired admin and bank identities', () => {
  const xcpc = resolveCesIdentity('XCPC');
  assert.equal(xcpc.adminAccount, 'XCPC0000');
  assert.equal(xcpc.bankAccount, 'XCPCBANK');

  registerCesExchange({ exchangeId: 'DEMO', adminAccount: 'DEMO0000', bankAccount: 'DEMOBANK' });
  const demo = resolveCesIdentity('demo');
  assert.equal(demo.adminAccount, 'DEMO0000');
  assert.equal(demo.bankAccount, 'DEMOBANK');
});

test('virtual trader is reviewed as an interexchange role on the selected CES', async () => {
  const registry = new BotRegistry();
  registry.register(NEO_BANK_BOT);
  const runtime = new NeoBotRuntime({ registry });
  runtime.attach(NEO_BANK_BOT.id, createNeoBankHandler({ cesAdapter: createStubCesAdapter() }));

  const response = await runtime.execute(NEO_BANK_BOT.id, {
    action: 'ces.virtual-trader.review',
    risk: 'read-only',
    exchangeId: 'XCPC',
    payload: {},
  });

  assert.equal(response.status, 'completed');
  assert.equal(response.result.operation, 'reviewVirtualTrader');
  assert.equal(response.result.exchange.exchangeId, 'XCPC');
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
