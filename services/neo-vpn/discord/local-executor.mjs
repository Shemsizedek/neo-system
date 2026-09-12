import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const vpnRoot = path.resolve(here, '..');

const COMMANDS = Object.freeze({
  'vpn-audit': path.join(vpnRoot, 'scripts', 'peer-audit.sh'),
  'vpn-runtime-status': path.join(vpnRoot, 'scripts', 'status-report.sh')
});

export function allowedLocalCommands() {
  return Object.keys(COMMANDS);
}

export async function executeLocalReadOnly(command, options = {}) {
  const script = COMMANDS[command];
  if (!script) throw new Error('local-command-not-allowlisted');

  const timeout = Number(options.timeoutMs ?? 5000);
  const maxBuffer = Number(options.maxBuffer ?? 64 * 1024);

  try {
    const { stdout, stderr } = await execFileAsync('/usr/bin/env', ['bash', script], {
      cwd: vpnRoot,
      timeout,
      maxBuffer,
      env: {
        PATH: process.env.PATH ?? '/usr/sbin:/usr/bin:/sbin:/bin',
        WG_INTERFACE: process.env.WG_INTERFACE ?? 'wg0',
        WG_CONFIG: process.env.WG_CONFIG ?? '/etc/wireguard/wg0.conf',
        MAX_HANDSHAKE_AGE: process.env.MAX_HANDSHAKE_AGE ?? '300'
      }
    });

    return {
      ok: true,
      command,
      stdout: stdout.trim(),
      stderr: stderr.trim()
    };
  } catch (error) {
    return {
      ok: false,
      command,
      stdout: String(error.stdout ?? '').trim(),
      stderr: String(error.stderr ?? '').trim(),
      reason: error.killed ? 'timeout' : `exit-${error.code ?? 'error'}`
    };
  }
}
