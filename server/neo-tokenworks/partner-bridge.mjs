import { readFileSync } from 'node:fs';
import { buildRetokenizationPlan } from './retokenization.mjs';

export const PARTNER_ID = 'cherokee-trinity';
export const PARTNER_REPOSITORY = 'kburrjr/cherokee-trinity-token-system';
const manifestUrl = new URL('../../registry/partners/cherokee-trinity.json', import.meta.url);
const readCapabilities = ['metadata', 'sourceIntegrityCheck', 'retokenizationPlanning'];
const disabledCapabilities = ['liveBalances', 'identityFederation', 'compose', 'sign', 'broadcast', 'custody', 'swap', 'settlement', 'collateralValuation'];
const sourcePaths = ['README.md', 'docs/ECOSYSTEM_OVERVIEW_v1.0.md', 'docs/VALUATION_AND_COMMERCIAL_STANDARDS_v1.0.md'];

// Changing a declaration cannot activate a wallet, financial operation or identity grant.
export function validatePartnerManifest(input) {
  const invalid = detail => { throw new Error(`invalid_partner_manifest: ${detail}`); };
  if (input?.schema !== 'neo.partner.reference.v1' || input.id !== PARTNER_ID || input.mode !== 'READ_ONLY_REFERENCE') invalid('reference mode required');
  if (input.relationship?.status !== 'USER_REPORTED_PARTNERSHIP' || input.relationship.agreementVerified !== false) invalid('unverified agreement required');
  if (input.source?.repository !== PARTNER_REPOSITORY || input.source.branch !== 'main' || !/^[a-f0-9]{40}$/.test(input.source.commit)) invalid('source identity');
  if (input.source.url !== `https://github.com/${PARTNER_REPOSITORY}` || input.source.access !== 'READ_ONLY') invalid('source access');
  if (input.network?.name !== 'XPR Network' || input.network.namespace !== 'xpr-network' || input.network.chainId !== null || input.network.rpcUrl !== null || input.network.deploymentVerified !== false) invalid('unverified network required');
  const caps = input.capabilities;
  if (!caps || Object.keys(caps).length !== readCapabilities.length + disabledCapabilities.length || readCapabilities.some(key => caps[key] !== true) || disabledCapabilities.some(key => caps[key] !== false)) invalid('read-only capabilities required');
  if (!Array.isArray(input.source.files) || input.source.files.length !== sourcePaths.length) invalid('source files');
  if (new Set(input.source.files.map(file => file.path)).size !== sourcePaths.length) invalid('duplicate source files');
  for (const file of input.source.files) {
    if (!sourcePaths.includes(file.path) || !/^[a-f0-9]{40}$/.test(file.gitBlobSha) || !/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes <= 0 || file.bytes > 128 * 1024) invalid('source fingerprint');
  }
  if (!Array.isArray(input.tokens) || input.tokens.length !== 3 || new Set(input.tokens.map(token => token.symbol)).size !== 3) invalid('three distinct tokens required');
  for (const token of input.tokens) {
    if (!['HALI', 'TSDU', 'WAYA'].includes(token.symbol) || token.precision !== 4 || token.contract !== 'tokencreate' || token.issuer !== 'kburrjr') invalid('token identity');
    if (typeof token.declaredSupply !== 'string' || !/^\d{1,20}\.\d{4}$/.test(token.declaredSupply) || BigInt(token.declaredSupply.replace('.', '')) <= 0n) invalid('decimal supply string required');
  }
  return structuredClone(input);
}

export function readPartnerManifest() {
  return validatePartnerManifest(JSON.parse(readFileSync(manifestUrl, 'utf8')));
}

export function createPartnerBridge({ manifest = readPartnerManifest() } = {}) {
  const reference = validatePartnerManifest(manifest);
  const capabilities = () => ({
    mode: 'READ_ONLY_REFERENCE',
    partners: [PARTNER_ID],
    ...structuredClone(reference.capabilities)
  });
  const listPartners = () => ({
    schema: 'neo.partner.catalog.v1',
    partners: [{ id: reference.id, name: reference.name, repository: reference.source.repository, mode: reference.mode }]
  });
  const getPartner = id => id === PARTNER_ID ? {
    ...structuredClone(reference), sourceIntegrity: 'PINNED_NOT_LIVE_CHECKED'
  } : null;
  const getAssets = id => id === PARTNER_ID ? {
    schema: 'neo.partner.assets.v1',
    partner: PARTNER_ID,
    mode: 'READ_ONLY_REFERENCE',
    assets: reference.tokens.map(token => ({
      ...structuredClone(token),
      assetId: `xpr-network:${token.contract}:${token.symbol}`,
      network: reference.network.name,
      chainId: null,
      verificationStatus: 'PARTNER_DECLARED',
      source: { repository: reference.source.repository, commit: reference.source.commit, path: 'README.md' }
    }))
  } : null;
  const getRetokenization = id => id === PARTNER_ID ? buildRetokenizationPlan(reference) : null;
  return { capabilities, listPartners, getPartner, getAssets, getRetokenization };
}
