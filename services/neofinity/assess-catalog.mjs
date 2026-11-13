// NEOFINITY-INF-001: schema/policy consistency checks only.
// This script cannot prove that physical devices, backhaul, routes or customers exist.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const read = (obj, dotted) => dotted.split('.').reduce((v, key) => v?.[key], obj);

export function assessCatalog(catalog) {
  const violations = [];
  const requireAll = (paths, context) => {
    for (const path of paths) {
      if (read(catalog, path) !== true) violations.push(context + ': ' + path + ' must be verified');
    }
  };
  if (catalog?.program !== 'NEOFINITY-INF-001') violations.push('Unexpected program identifier');
  if (!Array.isArray(catalog?.services) || catalog.services.length === 0) {
    violations.push('Service catalog must contain services');
  }
  if (catalog?.network?.private_ipv4_cidr !== '10.144.0.0/16') {
    violations.push('Canonical private overlay CIDR has changed without a reviewed migration');
  }

  const services = Array.isArray(catalog?.services) ? catalog.services : [];
  const ids = new Set();
  const validKinds = new Set(['encrypted-overlay', 'broadband-access', 'independent-routing']);
  for (const service of services) {
    if (!service.id || ids.has(service.id)) violations.push('Service IDs must be unique and nonempty');
    ids.add(service.id);
    if (!validKinds.has(service.kind)) violations.push('Unknown service kind: ' + service.kind);
    if (!['prelaunch', 'pilot', 'live', 'retired'].includes(service.status)) {
      violations.push('Unknown service status: ' + service.id);
    }
  }

  const live = services.filter(s => s.status === 'live');
  const activeAccess = live.some(s => s.kind === 'broadband-access');
  const activeMesh = live.some(s => s.kind === 'encrypted-overlay');
  const activeRouting = live.some(s => s.kind === 'independent-routing');
  if (live.length > 0) {
    if (catalog?.brand?.clearance_status !== 'cleared') {
      violations.push('Live service requires cleared public brand');
    }
    requireAll([
      'brand.legal_operator_verified',
      'operations.customer_support_ready',
      'operations.privacy_and_terms_approved',
      'operations.incident_response_ready',
      'operations.redacted_operational_evidence_approved'
    ], 'Live service');
  }

  if (activeMesh) {
    requireAll([
      'network.mesh.provider_account_enrolled',
      'network.mesh.real_two_peer_handshake',
      'network.mesh.revocation_verified',
      'network.mesh.access_policy_tested'
    ], 'Private mesh');
  }
  if (activeAccess || catalog?.network?.public_internet_live === true) {
    if (!activeAccess) violations.push('Public Internet live flag has no live access service');
    requireAll([
      'network.access.authorized_premise',
      'network.access.authorized_backhaul_contract',
      'network.access.link_healthy',
      'network.access.consumer_labels_approved',
      'network.access.regulatory_applicability_reviewed',
      'network.access.site_security_tested'
    ], 'Broadband access');
  }
  if (activeRouting || catalog?.network?.independent_public_routing_verified === true) {
    if (!catalog?.network?.public_asn || !catalog?.network?.public_ipv6_prefix) {
      violations.push('Independent public routing requires actual assigned ASN and prefix');
    }
    requireAll([
      'network.route.upstream_peering_verified',
      'network.route.rir_resource_rights_verified',
      'network.route.rpki_verified'
    ], 'Independent routing');
  }
  if (catalog?.commercial?.accepting_customers || catalog?.commercial?.accepting_payments) {
    if (!live.length) violations.push('Customer onboarding/payment enabled with no live service');
    requireAll(['operations.privacy_and_terms_approved'], 'Commercial operations');
  }
  return {
    program: catalog?.program ?? null,
    catalog_consistent: violations.length === 0,
    catalog_status: catalog?.status ?? 'unknown',
    live_service_count_claimed: live.length,
    public_internet_live_claimed: catalog?.network?.public_internet_live === true,
    independent_public_routing_claimed: catalog?.network?.independent_public_routing_verified === true,
    actual_runtime_or_physical_acceptance_tested: false,
    violations
  };
}

const self = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (self) {
  const defaultPath = resolve(dirname(fileURLToPath(import.meta.url)), 'catalog.json');
  const input = process.argv[2] || defaultPath;
  const result = assessCatalog(JSON.parse(readFileSync(input, 'utf8')));
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (!result.catalog_consistent) process.exitCode = 1;
}
