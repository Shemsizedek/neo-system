/**
 * NEOCAST-001: authorized OFFICIAL player launch planning only.
 * This module does not ingest, proxy, rehost, record or transmit media.
 * NEO TV's registry remains the source of public provider metadata.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SOURCE = new URL('../../docs/neo-tv/data/public-tv-providers.json', import.meta.url);
const POLICY = new URL('../../docs/neocast/approved-origins.json', import.meta.url);
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function safeOfficialUrl(raw, allowedHosts) {
  if (typeof raw !== 'string' || !Array.isArray(allowedHosts)) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443') return null;
    if (!allowedHosts.includes(url.hostname.toLowerCase())) return null;
    return url.toString();
  } catch { return null; }
}

export function buildDiscovery(providerRegistry, originPolicy) {
  const blocked = [];
  const entries = [];
  const providers = providerRegistry?.providers;
  const origins = originPolicy?.originPermissions;
  const validSetup =
    providerRegistry?.policy?.acceptedSourceClasses?.includes('green') === true &&
    originPolicy?.brand === 'Neofinity' &&
    originPolicy?.subsystem === 'NeoCast' &&
    originPolicy?.mode === 'read-only-official-launch' &&
    origins && typeof origins === 'object' && !Array.isArray(origins);
  if (!validSetup || !Array.isArray(providers)) {
    return {
      brand: 'Neofinity', service: 'NeoCast', mode: 'prelaunch',
      networkLiveVerified: false, broadcastOriginLiveVerified: false,
      entries: [], blocked: [{ id: 'registry', reason: 'invalid_policy_or_registry' }]
    };
  }

  const seen = new Set();
  for (const provider of providers) {
    const id = provider?.id;
    if (typeof id !== 'string' || !slug.test(id) || seen.has(id)) {
      blocked.push({ id: typeof id === 'string' ? id : '(missing)', reason: 'invalid_or_duplicate_id' });
      continue;
    }
    seen.add(id);
    // Public NEO TV "live" means registry status, NOT an active NeoCast broadcast.
    // Embedded, direct, authenticated, tuner and retransmission modes are not
    // permitted at this gate, even for an otherwise known provider.
    if (provider.status !== 'live' || provider.sourceClass !== 'green' ||
        provider.playbackMode !== 'official-player') {
      blocked.push({ id, reason: 'not_approved_for_official_launch' });
      continue;
    }
    const url = safeOfficialUrl(provider.officialUrl, origins[id]);
    if (!url) {
      blocked.push({ id, reason: 'unapproved_or_unsafe_official_origin' });
      continue;
    }
    entries.push({
      id, name: String(provider.name || id),
      category: String(provider.class || 'public-broadcaster'),
      regionNotice: String(provider.geo || 'Availability subject to provider restrictions'),
      officialUrl: url,
      route: 'open-external-official-player',
      mediaDelivery: 'provider-operated',
      licenseToRebroadcast: false,
      availabilityVerifiedLive: false
    });
  }
  return {
    brand: 'Neofinity',
    service: 'NeoCast',
    mode: 'read-only-official-launch',
    networkLiveVerified: false,
    broadcastOriginLiveVerified: false,
    entries, blocked
  };
}

export function planOfficialLaunch(discovery, providerId) {
  const provider = Array.isArray(discovery?.entries)
    ? discovery.entries.find(item => item.id === providerId) : null;
  if (!provider || discovery.mode !== 'read-only-official-launch' ||
      provider.route !== 'open-external-official-player' ||
      provider.mediaDelivery !== 'provider-operated' ||
      provider.licenseToRebroadcast !== false) {
    return { allowed: false, reason: 'no_approved_official_provider_route' };
  }
  // This is a navigation plan, NOT a playable stream or a signed grant of rights.
  return { allowed: true, action: 'open-url', url: provider.officialUrl,
    providerId, streamUrl: null, proxy: false, recording: false, retransmission: false };
}

export function loadCanonicalDiscovery() {
  const registry = JSON.parse(readFileSync(SOURCE, 'utf8'));
  const policy = JSON.parse(readFileSync(POLICY, 'utf8'));
  return buildDiscovery(registry, policy);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = loadCanonicalDiscovery();
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (!result.entries.length || result.blocked.length) process.exitCode = 1;
}
