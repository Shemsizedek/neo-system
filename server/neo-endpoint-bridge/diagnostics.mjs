import { execFile as nodeExecFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(nodeExecFile);

const DIAGNOSTICS = Object.freeze({
  'security.patch': ['shell', 'getprop', 'ro.build.version.security_patch'],
  'android.version': ['shell', 'getprop', 'ro.build.version.release'],
  'android.sdk': ['shell', 'getprop', 'ro.build.version.sdk'],
  'device.model': ['shell', 'getprop', 'ro.product.model'],
  'device.manufacturer': ['shell', 'getprop', 'ro.product.manufacturer'],
  'debug.usb': ['shell', 'settings', 'get', 'global', 'adb_enabled'],
  'debug.wireless': ['shell', 'settings', 'get', 'global', 'adb_wifi_enabled'],
  'developer.options': ['shell', 'settings', 'get', 'global', 'development_settings_enabled'],
  'accessibility.enabled': ['shell', 'settings', 'get', 'secure', 'enabled_accessibility_services'],
  'packages.user': ['shell', 'pm', 'list', 'packages', '-3']
});

export function listDiagnostics() {
  return Object.freeze(Object.keys(DIAGNOSTICS));
}

export function validateSerial(serial) {
  const value = String(serial ?? '').trim();
  if (!value || value.length > 160 || !/^[A-Za-z0-9._:%\-\[\]]+$/.test(value)) {
    throw new Error('invalid_adb_serial');
  }
  return value;
}

export async function runDiagnostic(name, { serial, execFile = execFileAsync, timeoutMs = 8000 } = {}) {
  if (!Object.hasOwn(DIAGNOSTICS, name)) throw new Error('unsupported_diagnostic');
  const safeSerial = validateSerial(serial);
  const args = ['-s', safeSerial, ...DIAGNOSTICS[name]];
  const result = await execFile('adb', args, {
    timeout: timeoutMs,
    windowsHide: true,
    maxBuffer: 256 * 1024,
    encoding: 'utf8'
  });
  return Object.freeze({
    schema: 'neo.endpoint.diagnostic.v1',
    name,
    serialRef: safeSerial,
    observedAt: new Date().toISOString(),
    sourceTrust: 'AUTHORIZED_ADB_HOST',
    instructionPolicy: 'DATA_ONLY_NO_EXECUTION',
    stdout: String(result?.stdout ?? '').trim().slice(0, 20000),
    stderr: String(result?.stderr ?? '').trim().slice(0, 4000),
    arbitraryShell: false,
    consequentialAction: false
  });
}

export async function collectSecurityPosture(options = {}) {
  const names = [
    'security.patch', 'android.version', 'android.sdk',
    'device.manufacturer', 'device.model',
    'developer.options', 'debug.usb', 'debug.wireless', 'accessibility.enabled'
  ];
  const observations = [];
  for (const name of names) observations.push(await runDiagnostic(name, options));
  return Object.freeze({
    schema: 'neo.endpoint.posture.v1',
    observedAt: new Date().toISOString(),
    observations: Object.freeze(observations),
    evidencePolicy: 'OBSERVATION_NOT_PROOF_OF_COMPROMISE',
    human999RequiredForConsequentialAction: true
  });
}
