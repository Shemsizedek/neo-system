import crypto from 'node:crypto';
import commandPolicy from './commands.json' with { type: 'json' };

const SECRET_FIELD_PATTERN = /(private.?key|seed|mnemonic|password|token|credential|cookie|recovery)/i;

export function validateRequest(request) {
  const command = commandPolicy.commands[request.command];
  if (!command) throw new Error('unsupported-command');

  for (const [key, value] of Object.entries(request.options ?? {})) {
    if (SECRET_FIELD_PATTERN.test(key)) throw new Error(`prohibited-secret-field:${key}`);
    if (typeof value === 'string' && value.length > 4096) throw new Error(`oversized-field:${key}`);
  }

  if (request.command === 'peer-request') {
    if (!request.options?.publicKey) throw new Error('public-key-required');
    if (!request.options?.overlayAddress) throw new Error('overlay-address-required');
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
  if (!approval?.approved || !approval?.approverId) {
    return { ...record, decision: 'denied' };
  }
  return {
    ...record,
    decision: 'approved',
    approverId: approval.approverId,
    approvedAt: new Date().toISOString()
  };
}
