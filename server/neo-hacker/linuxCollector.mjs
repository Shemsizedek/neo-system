import { createHash } from 'node:crypto';
import os from 'node:os';

const FORBIDDEN_KEYS = new Set(['keystrokes','typedText','password','passwords','apiKey','apiKeys','token','tokens','clipboard','clipboardText','messageBody','messageBodies','secret','secrets']);

function hash(value) {
  return createHash('sha256').update(String(value ?? '')).digest('hex');
}

export function sanitizeTelemetry(input = {}) {
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    if (Array.isArray(value)) out[key] = value.map(v => (v && typeof v === 'object') ? sanitizeTelemetry(v) : v);
    else if (value && typeof value === 'object') out[key] = sanitizeTelemetry(value);
    else out[key] = value;
  }
  return out;
}

export function collectLinuxSnapshot({ processList = [], network = [], integrity = [], now = Date.now() } = {}) {
  if (process.platform !== 'linux') {
    return { platform: process.platform, supported: false, mode: 'observe-only', collectedAt: new Date(now).toISOString() };
  }

  const snapshot = {
    platform: 'linux',
    supported: true,
    mode: 'observe-only',
    collectedAt: new Date(now).toISOString(),
    host: {
      hostnameHash: hash(os.hostname()),
      arch: os.arch(),
      release: os.release(),
      uptimeSeconds: Math.floor(os.uptime())
    },
    processes: processList.map(p => sanitizeTelemetry({
      pid: Number(p.pid),
      ppid: Number(p.ppid ?? 0),
      uid: p.uid == null ? null : Number(p.uid),
      executableHash: p.executableHash ?? null,
      commandName: p.commandName ?? null,
      privilege: p.privilege ?? null
    })),
    network: network.map(n => sanitizeTelemetry({
      protocol: n.protocol ?? null,
      localPort: n.localPort == null ? null : Number(n.localPort),
      remoteAddress: n.remoteAddress ?? null,
      remotePort: n.remotePort == null ? null : Number(n.remotePort),
      state: n.state ?? null,
      pid: n.pid == null ? null : Number(n.pid)
    })),
    integrity: integrity.map(i => sanitizeTelemetry({
      pathHash: i.pathHash ?? null,
      fileHash: i.fileHash ?? null,
      status: i.status ?? 'unknown',
      severity: i.severity ?? 'info'
    }))
  };

  return sanitizeTelemetry(snapshot);
}

export function validateCollectorPrivacy(snapshot = {}) {
  const serialized = JSON.stringify(snapshot);
  const forbiddenPatterns = [/"keystrokes"/i,/"typedText"/i,/"passwords?"/i,/"apiKeys?"/i,/"tokens?"/i,/"clipboard(Text)?"/i,/"messageBodies?"/i,/"secrets?"/i];
  const violations = forbiddenPatterns.filter(re => re.test(serialized)).map(re => re.source);
  return { valid: violations.length === 0, violations };
}
