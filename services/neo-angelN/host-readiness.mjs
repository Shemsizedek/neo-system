#!/usr/bin/env node
// Read-only host acceptance aid. Never installs, enables, restarts or enrolls.
import { readFile, lstat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileCheck } from './core.mjs';

const run = promisify(execFile);
const checks = {};
checks.linux = process.platform === 'linux';
checks.node22 = Number(process.versions.node.split('.')[0]) >= 22;
try {
  checks.systemd = (await readFile('/proc/1/comm', 'utf8')).trim() === 'systemd';
} catch { checks.systemd = false; }

const digests = {
  'angelN.mjs': '3fd71c851ec1ca672116e8f675e849575d869aa441af3829071e1ed8de28ef55',
  'core.mjs': 'c6904a7cbc54195144e1f0a00fd4c0d7cb5b07c5259f8e02f245eb436d50ce65',
};
for (const [name, digest] of Object.entries(digests)) {
  checks[name] = (await fileCheck('/opt/neo-angelN', name, digest)).outcome;
}
// Metadata only: enrollment may contain operator data; never read or print it.
try {
  const s = await lstat('/etc/neo-angelN/config.json');
  checks.configProtected = s.isFile() && !s.isSymbolicLink() && s.uid === 0 && (s.mode & 0o022) === 0;
} catch { checks.configProtected = false; }
for (const [key, verb] of [['serviceActive', 'is-active'], ['bootEnabled', 'is-enabled']]) {
  checks[key] = 'unverified';
  if (!checks.systemd) continue;
  try {
    const { stdout } = await run('/usr/bin/systemctl', [verb, 'neo-angelN.service'], {
      timeout: 5000, maxBuffer: 4096, env: { PATH: '/usr/bin:/bin', LC_ALL: 'C' },
    });
    checks[key] = stdout.trim() === (key === 'serviceActive' ? 'active' : 'enabled');
  } catch { checks[key] = false; }
}
const ready = checks.linux && checks.node22 && checks.systemd && checks.configProtected
  && checks.serviceActive === true && checks.bootEnabled === true
  && Object.keys(digests).every(name => checks[name] === 'baseline_match');
console.log(JSON.stringify({
  schema: 1, service: 'neo-angelN', observedAt: new Date().toISOString(),
  readiness: ready ? 'installation-observed' : 'blocked-or-incomplete', checks,
  enrollmentContents: 'not-read', continuousOperation: 'requires-timed-host-evidence',
  rebootAndLogout: 'not-tested', malwareScan: 'not-performed',
}, null, 2));
process.exitCode = ready ? 0 : 2;
