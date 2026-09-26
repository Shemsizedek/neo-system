const METADATA_TOKEN_URL='http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

const safe=value=>String(value||'').replace(/[^A-Za-z0-9._:-]/g,'_');
const clone=value=>value==null?value:structuredClone(value);

export function createMemorySocialOAuthStore(){
  const pending=new Map();
  const connections=new Map();
  return {
    mode:'memory',durable:false,
    async putState(state){pending.set(`${state.providerId}:${state.nonce}`,clone(state));},
    async consumeState(providerId,nonce,{maxAgeMs=10*60*1000,now=Date.now()}={}){
      const key=`${providerId}:${nonce}`;const state=pending.get(key)||null;pending.delete(key);
      if(state&&Number.isFinite(maxAgeMs)&&now-state.createdAt>maxAgeMs)return null;
      return clone(state);
    },
    async saveConnection(connection){connections.set(`${connection.identityId}:${connection.providerId}`,clone(connection));return clone(connection);},
    async getConnection(identityId,providerId){return clone(connections.get(`${identityId}:${providerId}`)||null);},
  };
}

async function metadataToken(fetchImpl=fetch){
  const res=await fetchImpl(METADATA_TOKEN_URL,{headers:{'Metadata-Flavor':'Google'}});
  if(!res.ok)throw new Error('gcp_metadata_token_unavailable');
  const body=await res.json();
  if(!body?.access_token)throw new Error('gcp_metadata_token_missing');
  return body.access_token;
}

export function createGcsSocialOAuthStore({bucket=process.env.NEO_SOCIAL_AUTOMATION_BUCKET,fetchImpl=fetch,tokenProvider=()=>metadataToken(fetchImpl)}={}){
  if(!bucket)throw new Error('NEO_SOCIAL_AUTOMATION_BUCKET is not configured');
  const api='https://storage.googleapis.com';
  async function auth(){return {Authorization:`Bearer ${await tokenProvider()}`};}
  async function read(name){
    const res=await fetchImpl(`${api}/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(name)}?alt=media`,{headers:await auth()});
    if(res.status===404)return null;
    if(!res.ok)throw new Error(`gcs_read_failed:${res.status}`);
    return res.json();
  }
  async function write(name,value){
    const q=new URLSearchParams({uploadType:'media',name});
    const res=await fetchImpl(`${api}/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?${q}`,{method:'POST',headers:{...(await auth()),'content-type':'application/json'},body:JSON.stringify(value)});
    if(!res.ok)throw new Error(`gcs_write_failed:${res.status}`);
    return value;
  }
  async function remove(name){
    const res=await fetchImpl(`${api}/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(name)}`,{method:'DELETE',headers:await auth()});
    if(res.status!==404&&!res.ok)throw new Error(`gcs_delete_failed:${res.status}`);
  }
  const root='social/oauth';
  return {
    mode:'gcs',durable:true,
    async putState(state){return write(`${root}/states/${safe(state.providerId)}/${safe(state.nonce)}.json`,state);},
    async consumeState(providerId,nonce,{maxAgeMs=10*60*1000,now=Date.now()}={}){
      const name=`${root}/states/${safe(providerId)}/${safe(nonce)}.json`;
      const state=await read(name);await remove(name);
      if(state&&Number.isFinite(maxAgeMs)&&now-state.createdAt>maxAgeMs)return null;
      return state;
    },
    async saveConnection(connection){return write(`${root}/connections/${safe(connection.identityId)}/${safe(connection.providerId)}.json`,connection);},
    async getConnection(identityId,providerId){return read(`${root}/connections/${safe(identityId)}/${safe(providerId)}.json`);},
  };
}
