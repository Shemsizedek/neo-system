import { getProductFounderBinding } from './products.mjs';

export const ORCHESTRATION_PRODUCTS=Object.freeze(['neo-router','neo-algo','neosync','neo-agent-runtime']);
const REQUIREMENTS=Object.freeze({
  'router.dispatch':['authenticated','delegationAuthorized'],
  'router.external_tool':['authenticated','delegationAuthorized','externalToolAuthorized','stepUpVerified'],
  'algo.trade.execute':['authenticated','delegationAuthorized','tradeExecutionAuthorized','stepUpVerified'],
  'neosync.execute':['authenticated','delegationAuthorized'],
  'agent.secret.read':['authenticated','delegationAuthorized','secretAccessAuthorized','stepUpVerified']
});

export function resolveOrchestrationFounder(productId){
  if(!ORCHESTRATION_PRODUCTS.includes(productId)) throw new Error(`unsupported orchestration product: ${productId}`);
  return getProductFounderBinding(productId);
}

export function authorizeOrchestrationAction(productId,action,context={}){
  const founder=resolveOrchestrationFounder(productId);
  const requirements=REQUIREMENTS[action];
  if(!requirements) return {allowed:false,reason:'unsupported_action',founder};
  if(context.subjectId!==founder.subjectId) return {allowed:false,reason:'subject_mismatch',founder};
  for(const requirement of requirements){if(context[requirement]!==true)return{allowed:false,reason:`missing_${requirement}`,founder}}
  return {allowed:true,reason:'authorized',founder};
}

export function registerAgentPrincipal({agentId,ownerSubject,scopes=[]}={}){
  if(!agentId||!ownerSubject) throw new Error('agentId and ownerSubject are required');
  if(ownerSubject==='neo:founder:000001'&&agentId==='neo:founder:000001') throw new Error('agent principal must be distinct from founder principal');
  return Object.freeze({agentId:String(agentId),ownerSubject:String(ownerSubject),scopes:Object.freeze([...new Set(scopes.map(String))]),mayImpersonateFounder:false,secretsStored:false});
}
