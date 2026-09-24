const METADATA_TOKEN_URL='http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

function safeKey(value){return String(value||'').replace(/[^A-Za-z0-9._:-]/g,'_');}
function laneKey(value){return safeKey(value||'social');}

export function createMemorySocialAutomationStore(){
  const approved=new Map();
  const claims=new Map();
  const receipts=new Map();
  return {
    async stageApprovedPayload(payload,{contentLane=payload?.contentLane||'social'}={}){approved.set(laneKey(contentLane),structuredClone(payload));},
    async getApprovedPayload({contentLane='omnitrix_chronicles'}={}){const value=approved.get(laneKey(contentLane));return value?structuredClone(value):null;},
    async claim(key,destination){
      const id=`${safeKey(key)}::${safeKey(destination)}`;
      if(claims.has(id)) return false;
      claims.set(id,{key,destination,claimedAt:new Date().toISOString()});
      return true;
    },
    async getReceipt(key,destination){return receipts.get(`${safeKey(key)}::${safeKey(destination)}`)??null;},
    async saveReceipt(key,destination,receipt){
      const id=`${safeKey(key)}::${safeKey(destination)}`;
      receipts.set(id,structuredClone(receipt));
      return receipt;
    },
  };
}

async function metadataToken(fetchImpl=fetch){
  const res=await fetchImpl(METADATA_TOKEN_URL,{headers:{'Metadata-Flavor':'Google'}});
  if(!res.ok) throw new Error('gcp_metadata_token_unavailable');
  const body=await res.json();
  if(!body?.access_token) throw new Error('gcp_metadata_token_missing');
  return body.access_token;
}

export function createGcsSocialAutomationStore({
  bucket=process.env.NEO_SOCIAL_AUTOMATION_BUCKET,
  fetchImpl=fetch,
  tokenProvider=()=>metadataToken(fetchImpl),
}={}){
  if(!bucket) throw new Error('NEO_SOCIAL_AUTOMATION_BUCKET is not configured');
  const api='https://storage.googleapis.com';
  const objectPath=(name)=>encodeURIComponent(name);

  async function auth(){return {Authorization:`Bearer ${await tokenProvider()}`};}
  async function readJson(name){
    const res=await fetchImpl(`${api}/storage/v1/b/${encodeURIComponent(bucket)}/o/${objectPath(name)}?alt=media`,{headers:await auth()});
    if(res.status===404) return null;
    if(!res.ok) throw new Error(`gcs_read_failed:${res.status}`);
    return res.json();
  }
  async function writeJson(name,value,{createOnly=false}={}){
    const query=new URLSearchParams({uploadType:'media',name});
    if(createOnly) query.set('ifGenerationMatch','0');
    const res=await fetchImpl(`${api}/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?${query}`,{
      method:'POST',headers:{...(await auth()),'content-type':'application/json'},body:JSON.stringify(value),
    });
    if(createOnly&&res.status===412) return false;
    if(!res.ok) throw new Error(`gcs_write_failed:${res.status}`);
    return true;
  }
  return {
    async stageApprovedPayload(payload,{contentLane=payload?.contentLane||'social'}={}){
      await writeJson(`${laneKey(contentLane)}/pending/approved.json`,payload); return payload;
    },
    async getApprovedPayload({contentLane='omnitrix_chronicles'}={}){
      const legacy=contentLane==='omnitrix_chronicles'?'omnitrix':laneKey(contentLane);
      return readJson(`${legacy}/pending/approved.json`);
    },
    async claim(key,destination){
      return writeJson(`social/idempotency/${safeKey(key)}/${safeKey(destination)}.json`,{key,destination,claimedAt:new Date().toISOString()},{createOnly:true});
    },
    async getReceipt(key,destination){return readJson(`social/receipts/${safeKey(key)}/${safeKey(destination)}.json`);},
    async saveReceipt(key,destination,receipt){await writeJson(`social/receipts/${safeKey(key)}/${safeKey(destination)}.json`,receipt);return receipt;},
  };
}
