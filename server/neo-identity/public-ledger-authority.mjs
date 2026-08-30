import { getProductFounderBinding } from './products.mjs';

export const PUBLIC_LEDGER_PRODUCTS=Object.freeze(['neo-explorer','neoscan','neo-ledger','neo-statements']);
const REQUIREMENTS=Object.freeze({
  'explorer.verify.publish':['authenticated','verificationPublishAuthorized','stepUpVerified'],
  'neoscan.index.mutate':['authenticated','indexMutationAuthorized','stepUpVerified'],
  'ledger.entry.mutate':['authenticated','ledgerMutationAuthorized','stepUpVerified'],
  'statements.publish':['authenticated','statementPublicationAuthorized','stepUpVerified'],
  'statements.certify':['authenticated','accountingCertificationAuthorized','stepUpVerified']
});
export function resolvePublicLedgerFounder(productId){if(!PUBLIC_LEDGER_PRODUCTS.includes(productId))throw new Error(`unsupported public ledger product: ${productId}`);return getProductFounderBinding(productId)}
export function authorizePublicLedgerAction(productId,action,context={}){const founder=resolvePublicLedgerFounder(productId);const requirements=REQUIREMENTS[action];if(!requirements)return{allowed:false,reason:'unsupported_action',founder};if(context.subjectId!==founder.subjectId)return{allowed:false,reason:'subject_mismatch',founder};for(const requirement of requirements){if(context[requirement]!==true)return{allowed:false,reason:`missing_${requirement}`,founder}}return{allowed:true,reason:'authorized',founder}}
export function provenanceEnvelope({sourceType,sourceId,observedAt,immutableReference}={}){if(!sourceType||!sourceId||!observedAt)throw new Error('sourceType, sourceId and observedAt are required');return Object.freeze({sourceType:String(sourceType),sourceId:String(sourceId),observedAt:String(observedAt),immutableReference:immutableReference?String(immutableReference):null,founderOverride:false})}
