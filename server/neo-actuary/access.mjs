// NEO-ACT-006: authenticated principal boundary; caller supplies independently verified identity.
import {buildRiskSnapshot} from './intake.mjs';
const roles=new Set(['treasury_reader','treasury_auditor']);
export function authorizePrincipal(principal,scope){
 if(!principal||principal.authenticated!==true||typeof principal.subject!=='string'||!principal.subject.trim()||!Array.isArray(principal.roles)||!principal.roles.some(r=>roles.has(r)))throw new Error('Authenticated Treasury role required');
 if(typeof principal.expiresAt!=='number'||!Number.isFinite(principal.expiresAt)||principal.expiresAt<=Date.now())throw new Error('Expired session');
 if(!Array.isArray(principal.scopes)||!principal.scopes.includes(scope))throw new Error('Scope not granted');
 return {subject:principal.subject,scope,role:principal.roles.find(r=>roles.has(r))};
}
export function guardedRiskProjection({principal,envelopes}){
 const actor=authorizePrincipal(principal,'actuary:read');
 const projection=buildRiskSnapshot(envelopes);
 return {schema:'NEO-ACT-006',actorRole:actor.role,asOf:projection.asOf,
  mode:'READ_ONLY_DRAFT',exceptions:projection.exceptionCounts,
  classifications:projection.eligibleBalances,
  sourceCount:projection.sources.length,
  warnings:['No independently authenticated upstream data','No actual blockchain proofs checked','Not audited or production approved']};
}
