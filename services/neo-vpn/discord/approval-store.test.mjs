import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'neo-vpn-approval-'));
process.env.NEO_VPN_APPROVAL_DIR = dir;
const { requestApproval, readApproval, decideApproval } = await import('./approval-store.mjs');
const make = () => ({
  correlationId: crypto.randomUUID(), command: 'peer-revoke', state: 'pending-approval',
  actor: { discordUserId: '111', guildId: '222', channelId: '333' },
  target: 'peer-1'
});
test('requires a distinct administrator and same guild', async () => {
  const r = await requestApproval(make());
  await assert.rejects(decideApproval(r.correlationId, {approverId:'111',guildId:'222',role:'admin',approved:true}), /independent/);
  await assert.rejects(decideApproval(r.correlationId, {approverId:'444',guildId:'222',role:'operator',approved:true}), /admin/);
  await assert.rejects(decideApproval(r.correlationId, {approverId:'444',guildId:'999',role:'admin',approved:true}), /guild/);
  const result = await decideApproval(r.correlationId, {approverId:'444',guildId:'222',role:'admin',approved:true});
  assert.equal(result.state, 'approved');
  assert.equal(result.executionState, 'disabled');
  await assert.rejects(decideApproval(r.correlationId, {approverId:'555',guildId:'222',role:'admin',approved:true}), /not-pending/);
});
test('rejects duplicate request IDs and unsupported commands', async () => {
  const r = make(); await requestApproval(r);
  await assert.rejects(requestApproval(r), /EEXIST/);
  await assert.rejects(requestApproval({...make(),command:'vpn-audit'}), /unsupported/);
  assert.equal((await readApproval(r.correlationId)).state,'pending-approval');
});
test.after(async () => { await fs.rm(dir,{recursive:true,force:true}); });
