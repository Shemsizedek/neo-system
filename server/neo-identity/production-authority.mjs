import { getProductFounderBinding } from './products.mjs';

export const PRODUCTION_PRODUCTS = Object.freeze(['neo-miner','neo-generator','world-mint']);

const REQUIREMENTS = Object.freeze({
  'miner.control': ['authenticated','minerControlAuthorized','stepUpVerified'],
  'miner.pool.configure': ['authenticated','poolConfigurationAuthorized','stepUpVerified'],
  'miner.payout.route': ['authenticated','payoutRoutingAuthorized','stepUpVerified'],
  'generator.activate': ['authenticated','contractActivationAuthorized','stepUpVerified'],
  'generator.generate': ['authenticated','generationAuthorized','stepUpVerified'],
  'generator.treasury.transfer': ['authenticated','treasuryTransferAuthorized','stepUpVerified'],
  'mint.asset.issue': ['authenticated','assetIssuanceAuthorized','stepUpVerified'],
  'mint.mint': ['authenticated','mintingAuthorized','stepUpVerified'],
  'mint.treasury.custody': ['authenticated','treasuryCustodyAuthorized','stepUpVerified'],
  'mint.payout.route': ['authenticated','payoutRoutingAuthorized','stepUpVerified']
});

export function resolveProductionFounder(productId) {
  if (!PRODUCTION_PRODUCTS.includes(productId)) throw new Error(`unsupported production product: ${productId}`);
  return getProductFounderBinding(productId);
}

export function authorizeProductionAction(productId, action, context = {}) {
  const founder = resolveProductionFounder(productId);
  const requirements = REQUIREMENTS[action];
  if (!requirements) return { allowed:false, reason:'unsupported_action', founder };
  if (context.subjectId !== founder.subjectId) return { allowed:false, reason:'subject_mismatch', founder };
  for (const requirement of requirements) {
    if (context[requirement] !== true) return { allowed:false, reason:`missing_${requirement}`, founder };
  }
  return { allowed:true, reason:'authorized', founder };
}

export function enrollMinerDevice({ deviceId, publicFingerprint, ownerSubject, verified=false, attested=false } = {}) {
  const founder = resolveProductionFounder('neo-miner');
  if (!deviceId || !publicFingerprint) throw new Error('deviceId and publicFingerprint are required');
  if (ownerSubject !== founder.subjectId) throw new Error('owner subject mismatch');
  if (verified !== true || attested !== true) throw new Error('verified and attested miner enrollment is required');
  return Object.freeze({
    productId:'neo-miner',
    deviceId:String(deviceId),
    publicFingerprint:String(publicFingerprint),
    ownerSubject:founder.subjectId,
    verified:true,
    attested:true,
    privateCredentialsStored:false
  });
}
