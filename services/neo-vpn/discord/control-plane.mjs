import crypto from 'node:crypto';
import commandPolicy from './commands.json' with { type: 'json' };

const SECRET_FIELD_PATTERN = /(private.?key|seed|mnemonic|password|token|credential|cookie|recovery)/i;
const WIREGUARD_PUBLIC_KEY_PATTERN = /^[A-Za-z0-9+/]{43}=$/;
const OVERLAY_ADDRESS_PATTERN = /^10\.144\.(10|30|40)\.(?:[1-9]|[1-9]\d|1\d\d|2[0-4]\d|25[0-4])\/32$/;

function requireIdentity(request) {
  for (const field of ['discordUserId', 'guildId', 'channelId']) {
    if (typeof request?.[field] !== 'string' || !request[field].trim()) {
      throw new Error(`identity-required:${field}`);
    }
  }
}

export function validateRequest(request) {
  if (!request || typeof request !== 'object') throw new Error('invalid-request');
  requireIdentity(request);

  const command = commandPolicy.commands[request.command];
  if (!command) throw new Error('unsupported-command');

  for (const [key, value] of Object.entries(request.options ?? {})) {
    if (SECRET_FIELD_PATTERN.test(key)) throw new Error(`prohibited-secret-field:${key}`);
    if (typeof value === 'string' && value.length > 4096) throw new Error(`oversized-field:${key}`);
  }

  if (request.command === 'peer-request') {
    const publicKey = String(request.options?.publicKey ?? '').trim();
    const overlayAddress = String(request.options?.overlayAddress ?? '').trim();
    const deviceLabel = String(request.options?.deviceLabel ?? '').trim();

    if (!WIREGUARD_PUBLIC_KEY_PATTERN.test(publicKey)) throw new Error('invalid-public-key');
    if (!OVERLAY_ADDRESS_PATTERN.test(overlayAddress)) throw new Error('invalid-overlay-address');
    if (!deviceLabel || deviceLabel.length > 128) throw new Error('invalid-device-label');
  }

  return command;
}

export function createControlRecord(request, infrastructureLive = false) {
  const policy = validateRequest(request);
  const correlationId = crypto.randomUUID();

  return {
    correlationId,
    command: request.command,
    actor: {
      discordUserId: request.discordUserId,
      guildId: request.guildId,
      channelId: request.channelId
    },
    requestedAt: new Date().toISOString(),
    policy,
    state: policy.mode === 'read'
      ? (infrastructureLive ? 'ready' : 'pending-infrastructure')
      : 'pending-approval',
    target: request.options?.deviceLabel ?? request.options?.peerId ?? 'neo-vpn-node-001'
  };
}

export function authorize(record, approval) {
  if (record.policy.approval === 'none') return { ...record, decision: 'approved' };
  if (!approval?.approved || typeof approval.approverId !== 'string' || !approval.approverId.trim()) {
    return { ...record, decision: 'denied' };
  }
  if (approval.approverId === record.actor.discordUserId) {
    return { ...record, decision: 'denied', reason: 'self-approval-prohibited' };
  }
  return {
    ...record,
    decision: 'approved',
    approverId: approval.approverId,
    approvedAt: new Date().toISOString()
  };
}
