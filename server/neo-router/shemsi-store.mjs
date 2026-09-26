const METADATA_TOKEN_URL='http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

const clone=value=>value==null?value:structuredClone(value);
const safe=value=>String(value||'').replace(/[^A-Za-z0-9._:-]/g,'_');
const now=()=>new Date().toISOString();

export function createMemoryShemsiStore(){
  const inbox=new Map();
  const drafts=new Map();
  const receipts=new Map();
  const subjectMap=(root,subject)=>{const key=safe(subject);if(!root.has(key))root.set(key,new Map());return root.get(key);};
  return {
    mode:'memory',durable:false,
    async putInbox(subject,item){const map=subjectMap(inbox,subject);map.set(item.id,clone(item));return clone(item);},
    async listInbox(subject){return [...subjectMap(inbox,subject).values()].map(clone).sort((a,b)=>String(b.receivedAt).localeCompare(String(a.receivedAt)));},
    async getInbox(subject,id){return clone(subjectMap(inbox,subject).get(id)||null);},
    async putDraft(subject,draft){const map=subjectMap(drafts,subject);map.set(draft.id,clone(draft));return clone(draft);},
    async listDrafts(subject){return [...subjectMap(drafts,subject).values()].map(clone).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));},
    async getDraft(subject,id){return clone(subjectMap(drafts,subject).get(id)||null);},
    async saveReceipt(subject,id,receipt){subjectMap(receipts,subject).set(id,clone(receipt));return clone(receipt);},
    async getReceipt(subject,id){return clone(subjectMap(receipts,subject).get(id)||null);},
  };
}

async function metadataToken(fetchImpl=fetch){
  const res=await fetchImpl(METADATA_TOKEN_URL,{headers:{'Metadata-Flavor':'Google'}});
  if(!res.ok)throw new Error('gcp_metadata_token_unavailable');
  const body=await res.json();
  if(!body?.access_token)throw new Error('gcp_metadata_token_missing');
  return body.access_token;
}

export function createGcsShemsiStore({
  bucket=process.env.NEO_SOCIAL_AUTOMATION_BUCKET,
  fetchImpl=fetch,
  tokenProvider=()=>metadataToken(fetchImpl),
}={}){
  if(!bucket)throw new Error('NEO_SOCIAL_AUTOMATION_BUCKET is not configured');
  const api='https://storage.googleapis.com';
  const root=(subject)=>`social/shemsi/${safe(subject)}`;
  async function auth(){return {Authorization:`Bearer ${await tokenProvider()}`};}
  async function read(name){
    const res=await fetchImpl(`${api}/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(name)}?alt=media`,{headers:await auth()});
    if(res.status===404)return null;
    if(!res.ok)throw new Error(`gcs_read_failed:${res.status}`);
    return res.json();
  }
  async function write(name,value){
    const q=new URLSearchParams({uploadType:'media',name});
    const res=await fetchImpl(`${api}/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?${q}`,{
      method:'POST',headers:{...(await auth()),'content-type':'application/json'},body:JSON.stringify(value),
    });
    if(!res.ok)throw new Error(`gcs_write_failed:${res.status}`);
    return value;
  }
  async function listPrefix(prefix){
    const q=new URLSearchParams({prefix});
    const res=await fetchImpl(`${api}/storage/v1/b/${encodeURIComponent(bucket)}/o?${q}`,{headers:await auth()});
    if(!res.ok)throw new Error(`gcs_list_failed:${res.status}`);
    const body=await res.json();
    const names=(body.items||[]).map(x=>x.name).filter(Boolean);
    return Promise.all(names.map(read));
  }
  return {
    mode:'gcs',durable:true,
    async putInbox(subject,item){return write(`${root(subject)}/inbox/${safe(item.id)}.json`,item);},
    async listInbox(subject){const values=await listPrefix(`${root(subject)}/inbox/`);return values.filter(Boolean).sort((a,b)=>String(b.receivedAt).localeCompare(String(a.receivedAt)));},
    async getInbox(subject,id){return read(`${root(subject)}/inbox/${safe(id)}.json`);},
    async putDraft(subject,draft){return write(`${root(subject)}/drafts/${safe(draft.id)}.json`,draft);},
    async listDrafts(subject){const values=await listPrefix(`${root(subject)}/drafts/`);return values.filter(Boolean).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));},
    async getDraft(subject,id){return read(`${root(subject)}/drafts/${safe(id)}.json`);},
    async saveReceipt(subject,id,receipt){return write(`${root(subject)}/receipts/${safe(id)}.json`,receipt);},
    async getReceipt(subject,id){return read(`${root(subject)}/receipts/${safe(id)}.json`);},
  };
}

export function makeInboxItem({platform,accountId,commentId,parentContentId,authorName=null,commentText,parentContentText=null,permalink=null,receivedAt=now()}={}){
  for(const [k,v] of Object.entries({platform,accountId,commentId,parentContentId,commentText}))if(typeof v!=='string'||!v.trim())throw new Error(`${k}_required`);
  return {schema:'neo.social.shemsi.inbox.v0.1',id:`${platform}:${accountId}:${commentId}`,platform,accountId,commentId,parentContentId,authorName,commentText,parentContentText,permalink,receivedAt,status:'open'};
}

export function makeDraft({inboxItem,responseText,tone='professional',createdAt=now()}={}){
  if(!inboxItem?.id)throw new Error('inbox_item_required');
  if(typeof responseText!=='string'||!responseText.trim())throw new Error('responseText_required');
  return {schema:'neo.social.shemsi.draft.v0.1',id:`draft:${inboxItem.id}`,inboxId:inboxItem.id,platform:inboxItem.platform,accountId:inboxItem.accountId,commentId:inboxItem.commentId,parentContentId:inboxItem.parentContentId,responseText:responseText.trim(),tone,status:'pending',approvedBy:null,approvedAt:null,createdAt,updatedAt:createdAt};
}

export function approveDraft(draft,{approvedBy,approvedAt=now()}={}){
  if(!draft?.id)throw new Error('draft_required');
  if(typeof approvedBy!=='string'||!approvedBy.trim())throw new Error('approvedBy_required');
  return {...draft,status:'approved',approvedBy:approvedBy.trim(),approvedAt,updatedAt:approvedAt};
}
