import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const STATES = new Set(['pending-approval', 'approved', 'denied', 'expired']);
const TTL_MS = 15 * 60 * 1000;
const DIRECTORY = process.env.NEO_VPN_APPROVAL_DIR || '/var/lib/neo-vpn/approvals';
const ID = /^[a-f0-9-]{36}$/i;

function safeRecord(record) {
  if (!record || !ID.test(record.correlationId) || !STATES.has(record.state)) throw new Error('invalid-record');
  if (!['peer-request', 'peer-revoke', 'incident-lockdown'].includes(record.command)) throw new Error('unsupported-mutation');
  if (!record.actor?.discordUserId || !record.actor?.guildId || !record.actor?.channelId) throw new Error('missing-identity');
  return record;
}
function location(id) {
  if (!ID.test(id)) throw new Error('invalid-request-id');
  return path.join(DIRECTORY, id + '.json');
}
async function save(record, exclusive = false) {
  await fs.mkdir(DIRECTORY, { recursive: true, mode: 0o700 });
  const filename = location(record.correlationId);
  const temp = filename + '.' + crypto.randomUUID() + '.tmp';
  await fs.writeFile(temp, JSON.stringify(record), { mode: 0o600, flag: 'wx' });
  try {
    if (exclusive) {
      await fs.link(temp, filename);
    } else {
      await fs.rename(temp, filename);
    }
  } finally { await fs.unlink(temp).catch(() => {}); }
  return record;
}
export async function requestApproval(record) {
  safeRecord(record);
  if (record.state !== 'pending-approval') throw new Error('not-pending');
  return save({ ...record, expiresAt: new Date(Date.now() + TTL_MS).toISOString(), decision: null }, true);
}
export async function readApproval(id) {
  const record = safeRecord(JSON.parse(await fs.readFile(location(id), 'utf8')));
  return Date.now() > Date.parse(record.expiresAt) && record.state === 'pending-approval'
    ? { ...record, state: 'expired' } : record;
}
// Decision updates are serialized by an atomic per-request lock; failures never execute a mutation.
export async function decideApproval(id, { approverId, guildId, role, approved }) {
  const lock = location(id) + '.lock';
  const handle = await fs.open(lock, 'wx', 0o600);
  try {
    const record = await readApproval(id);
    if (record.state !== 'pending-approval') throw new Error('request-not-pending');
    if (guildId !== record.actor.guildId) throw new Error('guild-mismatch');
    if (role !== 'admin') throw new Error('admin-required');
    if (!approverId || approverId === record.actor.discordUserId) throw new Error('independent-approver-required');
    const updated = {
      ...record, state: approved ? 'approved' : 'denied',
      decision: approved ? 'approved' : 'denied',
      approverId, decidedAt: new Date().toISOString(),
      executionState: 'disabled'
    };
    await save(updated);
    return updated;
  } finally { await handle.close(); await fs.unlink(lock).catch(() => {}); }
}
