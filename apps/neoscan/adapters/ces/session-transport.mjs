import {normalizeCesSnapshot} from './ingestion.mjs';

export const CES_SESSION_TRANSPORT_SCHEMA='neo.ces.session.transport.v1';

function clean(value){return String(value??'').trim();}

export function createCesAuthorizedSessionTransport(config={}){
  const fetchImpl=config.fetchImpl||fetch;
  const baseUrl=clean(config.baseUrl).replace(/\/$/,'');
  const network=clean(config.network)||null;
  const account=clean(config.account);

  function status(){
    return {
      schema:CES_SESSION_TRANSPORT_SCHEMA,
      readOnly:true,
      configured:Boolean(baseUrl&&account),
      baseUrl:baseUrl||null,
      network,
      account:account||null,
      credentialPersistence:false
    };
  }

  async function readSnapshot({sessionCookie,signal}={}){
    if(!baseUrl||!account)throw new Error('CES session transport is not configured');
    const cookie=clean(sessionCookie);
    if(!cookie)throw new Error('Authorized CES session material is required');

    const response=await fetchImpl(`${baseUrl}/neo-export/read-only?account=${encodeURIComponent(account)}`,{
      method:'GET',
      headers:{accept:'application/json',cookie},
      redirect:'error',
      signal
    });

    if(response.status===401||response.status===403)throw new Error('CES session expired or unauthorized');
    if(!response.ok)throw new Error(`CES session source returned ${response.status}`);

    const contentType=String(response.headers?.get?.('content-type')||'');
    if(!contentType.includes('application/json'))throw new Error('CES session source returned a malformed response');

    const payload=await response.json();
    if(!payload||typeof payload!=='object')throw new Error('CES session source returned an invalid payload');

    return normalizeCesSnapshot({
      ...payload,
      account:payload.account||account,
      network:payload.network||network,
      provenance:{
        method:'authorized-session',
        reference:clean(payload?.provenance?.reference)||`${baseUrl}:${account}`
      }
    });
  }

  return {status,readSnapshot};
}
