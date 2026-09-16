import { isIP } from 'node:net';

function ipv4Private(host) {
  const p = host.split('.').map(Number);
  return p[0] === 10 || p[0] === 127 || (p[0] === 192 && p[1] === 168) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 169 && p[1] === 254);
}

export function classifyEnrollmentTarget(input) {
  const value = String(input ?? '').trim();
  if (!value || value.length > 255) throw new Error('invalid_target');
  const host = value.startsWith('[') ? value.slice(1, value.indexOf(']')) : value.split(':')[0];
  const ipVersion = isIP(host);
  const privateTarget = host === 'localhost' || host.endsWith('.local') || (ipVersion === 4 && ipv4Private(host)) || (ipVersion === 6 && (host === '::1' || host.toLowerCase().startsWith('fe80:') || /^f[cd]/i.test(host)));
  return Object.freeze({ target: value, host, privateTarget, publicInternetAllowed: false });
}

export function requirePrivateEnrollmentTarget(input) {
  const result = classifyEnrollmentTarget(input);
  if (!result.privateTarget) throw new Error('public_adb_target_refused');
  return result;
}

export function buildHostPolicy({ target, endpointId, hostFingerprint } = {}) {
  const network = requirePrivateEnrollmentTarget(target);
  if (!String(endpointId ?? '').startsWith('neo:endpoint:')) throw new Error('invalid_endpoint_id');
  if (!/^[a-fA-F0-9:]{32,128}$/.test(String(hostFingerprint ?? ''))) throw new Error('invalid_public_key_fingerprint');
  return Object.freeze({
    schema: 'neo.endpoint.host-policy.v1',
    endpointId,
    target: network.target,
    hostPublicKeyFingerprint: hostFingerprint,
    transport: 'PRIVATE_NETWORK_OR_VPN',
    publicInternetAdb: false,
    arbitraryShellApi: false,
    credentialStorage: false,
    pairingCodeStorage: false,
    humanEnrollmentRequired: true
  });
}
