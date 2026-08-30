import { getProductFounderBinding } from './products.mjs';

export const BANKING_PRODUCTS = Object.freeze(['nibiru-reserve','neo-bank','neo-ces','neo-treasury']);

const ACTION_REQUIREMENTS = Object.freeze({
  'reserve.custody': ['authenticated','reserveCustodyAuthorized','stepUpVerified'],
  'reserve.issue': ['authenticated','issuanceAuthorized','stepUpVerified'],
  'treasury.transfer': ['authenticated','treasuryTransferAuthorized','stepUpVerified'],
  'bank.transaction.approve': ['authenticated','transactionApprovalAuthorized','stepUpVerified'],
  'bank.vdollar.issue': ['authenticated','vdollarIssuanceAuthorized','stepUpVerified'],
  'ces.admin': ['authenticated','cesAdminAuthorized','stepUpVerified'],
  'ces.transaction.approve': ['authenticated','transactionApprovalAuthorized','stepUpVerified'],
  'treasury.sign': ['authenticated','signingAuthorized','stepUpVerified']
});

export function resolveBankingFounder(productId) {
  if (!BANKING_PRODUCTS.includes(productId)) throw new Error(`unsupported banking product: ${productId}`);
  return getProductFounderBinding(productId);
}

export function authorizeBankingAction(productId, action, context = {}) {
  const founder = resolveBankingFounder(productId);
  const requirements = ACTION_REQUIREMENTS[action];
  if (!requirements) return { allowed:false, reason:'unsupported_action', founder };
  if (context.subjectId !== founder.subjectId) return { allowed:false, reason:'subject_mismatch', founder };
  for (const requirement of requirements) {
    if (context[requirement] !== true) return { allowed:false, reason:`missing_${requirement}`, founder };
  }
  return { allowed:true, reason:'authorized', founder };
}

export function mapExternalCesAccount({ productId='neo-ces', exchangeId, externalAccount, verified=false } = {}) {
  const founder = resolveBankingFounder(productId);
  if (!exchangeId || !externalAccount) throw new Error('exchangeId and externalAccount are required');
  if (verified !== true) throw new Error('external CES mapping must be verified');
  return Object.freeze({
    subjectId: founder.subjectId,
    productId,
    exchangeId: String(exchangeId).toUpperCase(),
    externalAccount: String(externalAccount),
    verified: true,
    nativeOrdinalOverride: false,
    credentialsStored: false
  });
}
