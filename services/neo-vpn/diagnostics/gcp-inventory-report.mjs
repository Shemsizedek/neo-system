import { readFileSync } from 'node:fs';

const TARGET = 'neo-vpn-node-001';

/**
 * Classifies read-only Google Cloud inventory results.
 * Never concludes that a WireGuard VPN is live based only on a VM or reserved IP.
 * Does not print public endpoints, peer keys or full instance metadata.
 */
export function assessGatewayInventory(instances, addresses, { capturedAt } = {}) {
  if (!Array.isArray(instances) || !Array.isArray(addresses)) {
    throw new TypeError('instance_and_address_arrays_required');
  }
  const targets = instances.filter(item => item?.name === TARGET);
  const evidence = {
    schema: 'neo.ip.net003.gateway-inventory.v1',
    target: TARGET,
    captured_at: capturedAt ?? new Date().toISOString(),
    inventory: 'UNKNOWN',
    machine_running: false,
    ip_forwarding_enabled: false,
    public_endpoint_present: false,
    public_address_reserved: false,
    wireguard_verified: false,
    peer_handshakes_verified: false,
    firewall_isolation_verified: false,
    two_device_acceptance_verified: false,
    production_state: 'NOT_CERTIFIED'
  };

  if (targets.length === 0) {
    return { ...evidence, inventory: 'NOT_FOUND_IN_AUTHORIZED_PROJECT',
      next: 'Check existing project scope and deployment history; do not provision.' };
  }
  if (targets.length !== 1) {
    return { ...evidence, inventory: 'AMBIGUOUS_MULTIPLE_MATCHES',
      next: 'Identify exact existing instance and zone; do not provision.' };
  }
  const vm = targets[0];
  const natIps = (vm.networkInterfaces ?? [])
    .flatMap(n => n?.accessConfigs ?? [])
    .map(a => a?.natIP)
    .filter(v => typeof v === 'string' && v.length > 0);
  const linked = addresses.filter(a => natIps.includes(a?.address) &&
    a?.status === 'IN_USE' && a?.addressType === 'EXTERNAL');
  const state = {
    ...evidence,
    inventory: 'FOUND',
    machine_running: vm.status === 'RUNNING',
    ip_forwarding_enabled: vm.canIpForward === true,
    public_endpoint_present: natIps.length > 0,
    public_address_reserved: linked.length > 0,
    next: 'Verify host WireGuard, narrow firewall, device handshakes, revocation and reboot using authorized host access.'
  };
  return state;
}

if (process.argv[1]?.endsWith('/gcp-inventory-report.mjs')) {
  const [instancePath, addressPath] = process.argv.slice(2);
  if (!instancePath || !addressPath) {
    process.stderr.write('Usage: node gcp-inventory-report.mjs <instances.json> <addresses.json>\n');
    process.exitCode = 2;
  } else {
    try {
      const instances = JSON.parse(readFileSync(instancePath, 'utf8'));
      const addresses = JSON.parse(readFileSync(addressPath, 'utf8'));
      process.stdout.write(JSON.stringify(assessGatewayInventory(instances, addresses), null, 2) + '\n');
    } catch {
      process.stderr.write('INVENTORY_UNVERIFIED: failed to read/parse authorized discovery data.\n');
      process.exitCode = 1;
    }
  }
}
