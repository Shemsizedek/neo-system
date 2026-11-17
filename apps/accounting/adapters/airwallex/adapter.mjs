export const AIRWALLEX_ACCOUNTING_SCHEMA='neo.airwallex.accounting-fields.v1';
const SANDBOX='https://api.sandbox.airwallex.com';
const PRODUCTION='https://api.airwallex.com';

function clean(value){return String(value??'').trim();}

export function createAirwallexAccountingAdapter(config={}){
  const baseUrl=String(config.baseUrl||SANDBOX).replace(/\/$/,'');
  const clientId=clean(config.clientId);
  const apiKey=clean(config.apiKey);
  const loginAs=clean(config.loginAs);
  const fetchImpl=config.fetchImpl||fetch;
  let accessToken=null;
  let tokenExpiresAt=0;

  function status(){
    return {
      schema:AIRWALLEX_ACCOUNTING_SCHEMA,
      configured:Boolean(clientId&&apiKey),
      environment:baseUrl===PRODUCTION?'production':baseUrl===SANDBOX?'sandbox':'custom',
      readOnly:true,
      connectionState:clientId&&apiKey?'credentials-configured':'credentials-pending',
      tokenCached:Boolean(accessToken&&Date.now()<tokenExpiresAt)
    };
  }

  async function getAccessToken({signal}={}){
    if(!clientId||!apiKey)throw new Error('Airwallex Client ID and API key are required');
    if(accessToken&&Date.now()<tokenExpiresAt-60000)return accessToken;
    const headers={'x-client-id':clientId,'x-api-key':apiKey,accept:'application/json'};
    if(loginAs)headers['x-login-as']=loginAs;
    const response=await fetchImpl(`${baseUrl}/api/v1/authentication/login`,{method:'POST',headers,signal});
    if(!response.ok)throw new Error(`Airwallex authentication returned ${response.status}`);
    const payload=await response.json();
    const expiresAt=Date.parse(payload?.expires_at||'');
    if(!clean(payload?.token)||!Number.isFinite(expiresAt))throw new Error('Airwallex authentication response is missing token or expires_at');
    accessToken=payload.token;
    tokenExpiresAt=expiresAt;
    return accessToken;
  }

  async function getJson(path,{params={},signal}={}){
    const token=await getAccessToken({signal});
    const url=new URL(`${baseUrl}${path}`);
    for(const [key,value] of Object.entries(params))if(value!==undefined&&value!==null&&value!=='')url.searchParams.set(key,String(value));
    const response=await fetchImpl(url.toString(),{method:'GET',headers:{authorization:`Bearer ${token}`,accept:'application/json'},signal});
    if(!response.ok)throw new Error(`Airwallex accounting API returned ${response.status} for ${path}`);
    return response.json();
  }

  async function listAll(path,{params={},signal,maxPages=100}={}){
    const items=[];
    let page=null;
    const seen=new Set();
    for(let index=0;index<maxPages;index++){
      const payload=await getJson(path,{params:{...params,page_size:100,page},signal});
      const rows=Array.isArray(payload?.items)?payload.items:[];
      items.push(...rows);
      const next=clean(payload?.page_after);
      if(!next) return {items,readOnly:true,pages:index+1};
      if(seen.has(next))throw new Error('Airwallex pagination cursor repeated');
      seen.add(next);
      page=next;
    }
    throw new Error('Airwallex pagination exceeded the configured page limit');
  }

  async function listAccountingFields({status:fieldStatus='ACTIVE',signal}={}){
    return listAll('/api/v1/accounting/accounting_fields',{params:{status:fieldStatus},signal});
  }

  async function getAccountingField({id,signal}={}){
    const fieldId=clean(id);
    if(!fieldId)throw new Error('Airwallex accounting field ID is required');
    return getJson(`/api/v1/accounting/accounting_fields/${encodeURIComponent(fieldId)}`,{signal});
  }

  async function listAccountingFieldValues({accountingFieldId,externalId,legalEntityId,status:valueStatus='ACTIVE',signal}={}){
    return listAll('/api/v1/accounting/accounting_field_values',{
      params:{accounting_field_id:accountingFieldId,external_id:externalId,legal_entity_id:legalEntityId,status:valueStatus},
      signal
    });
  }

  async function getAccountingFieldValue({id,signal}={}){
    const valueId=clean(id);
    if(!valueId)throw new Error('Airwallex accounting field value ID is required');
    return getJson(`/api/v1/accounting/accounting_field_values/${encodeURIComponent(valueId)}`,{signal});
  }

  return {status,getAccessToken,listAccountingFields,getAccountingField,listAccountingFieldValues,getAccountingFieldValue};
}

export const AIRWALLEX_ENVIRONMENTS={sandbox:SANDBOX,production:PRODUCTION};
