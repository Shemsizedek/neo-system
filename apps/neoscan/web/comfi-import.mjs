import {createComfiEvidenceGraph} from './comfi-evidence.mjs';
export const MAX_IMPORT_BYTES=2*1024*1024;
export function importComfiSource(text,{authorized=false,sourceRef='',observedAt=new Date().toISOString()}={}){
  if(authorized!==true)throw Error('source_authorization_required');
  if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_IMPORT_BYTES)throw Error('import_size_limit');
  if(typeof sourceRef!=='string'||!sourceRef.trim())throw Error('import_source_required');
  const input=JSON.parse(text);
  if(!input||input.schema!=='neo.comfi.source.v1'||!Array.isArray(input.records)||input.records.length>10000||!Array.isArray(input.links)||input.links.length>10000)throw Error('invalid_source_bundle');
  // No imported assertion is automatically promoted to corroborated evidence.
  const records=input.records.map(r=>({...r,evidenceState:'source_observed',observedAt,sourceRefs:[sourceRef.trim(),...(Array.isArray(r.sourceRefs)?r.sourceRefs:[])]}));
  const links=input.links.map(l=>({...l,status:'candidate'}));
  return createComfiEvidenceGraph({projectId:input.projectId,records,links});
}
export function displayExactAmount({minorUnits,scale}){
  const negative=minorUnits.startsWith('-'),digits=(negative?minorUnits.slice(1):minorUnits).padStart(scale+1,'0');
  return (negative?'-':'')+(scale?digits.slice(0,-scale)+'.'+digits.slice(-scale):digits);
}
