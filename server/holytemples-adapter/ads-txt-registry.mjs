const ALLOWED_RELATIONSHIPS=new Set(['DIRECT','RESELLER']);
const VARIABLE_KEYS=new Set(['OWNERDOMAIN','MANAGERDOMAIN','CONTACT','SUBDOMAIN','INVENTORYPARTNERDOMAIN']);

function clean(value=''){return String(value).trim()}
function normalizeRelationship(value=''){return clean(value).toUpperCase()}

export function validateAuthorizedSeller(record={}){
  const errors=[];
  const domain=clean(record.domain).toLowerCase();
  const publisherId=clean(record.publisherId);
  const relationship=normalizeRelationship(record.relationship);
  const certificationAuthorityId=clean(record.certificationAuthorityId);
  if(!domain||!domain.includes('.')||/\s/.test(domain))errors.push('invalid_domain');
  if(!publisherId)errors.push('missing_publisher_id');
  if(!ALLOWED_RELATIONSHIPS.has(relationship))errors.push('invalid_relationship');
  if(certificationAuthorityId&&/\s/.test(certificationAuthorityId))errors.push('invalid_certification_authority_id');
  return{valid:errors.length===0,errors,normalized:{domain,publisherId,relationship,certificationAuthorityId}};
}

export function validateVariable(variable={}){
  const key=clean(variable.key).toUpperCase();
  const value=clean(variable.value);
  const errors=[];
  if(!key||!value)errors.push('missing_key_or_value');
  if(key&&!VARIABLE_KEYS.has(key))errors.push('unknown_variable');
  return{valid:errors.length===0,errors,normalized:{key,value}};
}

export function validateAdsRegistry(registry={}){
  const observations=[];
  const seen=new Set();
  const records=[];
  for(const [index,input] of (registry.records||[]).entries()){
    const result=validateAuthorizedSeller(input);
    if(!result.valid){observations.push({severity:'error',code:'invalid_record',index,errors:result.errors});continue}
    const r=result.normalized;
    const key=[r.domain,r.publisherId,r.relationship,r.certificationAuthorityId].join('|').toLowerCase();
    if(seen.has(key)){observations.push({severity:'warning',code:'duplicate_record',index});continue}
    seen.add(key);records.push(r);
  }
  const variables=[];
  for(const [index,input] of (registry.variables||[]).entries()){
    const result=validateVariable(input);
    if(!result.valid){observations.push({severity:result.errors.includes('unknown_variable')?'warning':'error',code:'invalid_variable',index,errors:result.errors});continue}
    variables.push(result.normalized);
  }
  if(records.length===0)observations.push({severity:'error',code:'empty_registry'});
  return{valid:!observations.some(o=>o.severity==='error'),records,variables,observations};
}

export function renderAdsTxt(registry={}){
  const checked=validateAdsRegistry(registry);
  if(!checked.valid)throw new Error('invalid_ads_registry');
  const lines=[];
  for(const variable of checked.variables)lines.push(`${variable.key}=${variable.value}`);
  for(const record of checked.records){
    const base=`${record.domain}, ${record.publisherId}, ${record.relationship}`;
    lines.push(record.certificationAuthorityId?`${base}, ${record.certificationAuthorityId}`:base);
  }
  return lines.join('\n')+'\n';
}

export const FAMILY_OFFICE_ADS_REGISTRY=Object.freeze({
  owner:'Shelton Estate & Co.',
  host:'office.holytemples.org',
  records:[
    Object.freeze({
      domain:'google.com',
      publisherId:'pub-7219200716649339',
      relationship:'DIRECT',
      certificationAuthorityId:'f08c47fec0942fa0'
    })
  ],
  variables:[]
});

export function familyOfficeAdsEvidence(){
  const result=validateAdsRegistry(FAMILY_OFFICE_ADS_REGISTRY);
  return{
    ok:result.valid,
    host:FAMILY_OFFICE_ADS_REGISTRY.host,
    recordCount:result.records.length,
    observations:result.observations
  };
}
