const FIRESTORE_API='https://firestore.googleapis.com/v1';
const METADATA_TOKEN_URL='http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

function encodeValue(value){
  if(value===null||value===undefined)return {nullValue:null};
  if(value instanceof Date)return {timestampValue:value.toISOString()};
  if(Array.isArray(value))return {arrayValue:{values:value.map(encodeValue)}};
  switch(typeof value){
    case 'boolean':return {booleanValue:value};
    case 'number':return Number.isInteger(value)?{integerValue:String(value)}:{doubleValue:value};
    case 'string':return {stringValue:value};
    case 'object':return {mapValue:{fields:encodeFields(value)}};
    default:throw new Error(`firestore_unsupported_value:${typeof value}`);
  }
}
function encodeFields(value){return Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).map(([k,v])=>[k,encodeValue(v)]));}
function decodeValue(value={}){
  if('nullValue'in value)return null;
  if('booleanValue'in value)return value.booleanValue;
  if('integerValue'in value)return Number(value.integerValue);
  if('doubleValue'in value)return Number(value.doubleValue);
  if('timestampValue'in value)return value.timestampValue;
  if('stringValue'in value)return value.stringValue;
  if('arrayValue'in value)return (value.arrayValue?.values||[]).map(decodeValue);
  if('mapValue'in value)return decodeFields(value.mapValue?.fields||{});
  return null;
}
function decodeFields(fields={}){return Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,decodeValue(v)]));}
function snapshot(document,id){return document?{exists:true,id:id||document.name?.split('/').pop(),data:()=>decodeFields(document.fields||{})}:{exists:false,id,data:()=>undefined};}

export function createMetadataTokenProvider({fetchImpl=fetch,now=()=>Date.now()}={}){
  let cached=null;
  return async()=>{
    if(cached&&cached.expiresAt-now()>60_000)return cached.token;
    const res=await fetchImpl(METADATA_TOKEN_URL,{headers:{'Metadata-Flavor':'Google'}});
    if(!res.ok)throw new Error(`metadata_token_failed:${res.status}`);
    const body=await res.json();
    cached={token:body.access_token,expiresAt:now()+Number(body.expires_in||300)*1000};
    return cached.token;
  };
}

export function createFirestoreRestDb({projectId,databaseId='(default)',fetchImpl=fetch,tokenProvider=createMetadataTokenProvider({fetchImpl})}={}){
  if(!projectId)throw new Error('firestore_project_id_required');
  const database=`projects/${projectId}/databases/${databaseId}`;
  const documentsRoot=`${database}/documents`;
  const base=`${FIRESTORE_API}/${documentsRoot}`;

  async function request(url,{method='GET',body,allow404=false}={}){
    const token=await tokenProvider();
    const res=await fetchImpl(url,{method,headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
    if(allow404&&res.status===404)return null;
    const text=await res.text();
    const parsed=text?JSON.parse(text):null;
    if(!res.ok){const error=new Error(parsed?.error?.message||`firestore_http_${res.status}`);error.status=res.status;error.firestoreStatus=parsed?.error?.status;throw error;}
    return parsed;
  }
  function fullName(path){return `${documentsRoot}/${path}`;}
  function doc(path,id){
    const documentPath=`${path}/${id}`;
    return {
      _path:documentPath,
      _name:fullName(documentPath),
      id,
      async get(){const d=await request(`${base}/${documentPath}`,{allow404:true});return snapshot(d,id);},
      async set(value,{merge=false}={}){
        const query=merge?'?updateMask.fieldPaths=updatedAt':'';
        const d=await request(`${base}/${documentPath}${query}`,{method:'PATCH',body:{fields:encodeFields(value)}});
        return snapshot(d,id);
      },
      async delete(){await request(`${base}/${documentPath}`,{method:'DELETE',allow404:true});}
    };
  }
  function collection(name){
    return {
      doc:id=>doc(name,id),
      where(field,op,value){
        if(op!=='==')throw new Error('firestore_rest_only_equality_supported');
        return {
          orderBy(orderField,direction='asc'){
            return {
              limit(count){
                return {
                  async get(){
                    const body={structuredQuery:{from:[{collectionId:name}],where:{fieldFilter:{field:{fieldPath:field},op:'EQUAL',value:encodeValue(value)}},orderBy:[{field:{fieldPath:orderField},direction:String(direction).toLowerCase()==='desc'?'DESCENDING':'ASCENDING'}],limit:Number(count)}};
                    const rows=await request(`${base}:runQuery`,{method:'POST',body});
                    return {docs:(rows||[]).filter(x=>x.document).map(x=>snapshot(x.document))};
                  }
                };
              }
            };
          }
        };
      }
    };
  }
  async function beginTransaction(){return (await request(`${base}:beginTransaction`,{method:'POST',body:{options:{readWrite:{}}}})).transaction;}
  async function batchGet(ref,transaction){
    const rows=await request(`${base}:batchGet`,{method:'POST',body:{documents:[ref._name],transaction}});
    const row=(rows||[])[0];
    return row?.found?snapshot(row.found,ref.id):snapshot(null,ref.id);
  }
  async function commit(transaction,writes){return request(`${base}:commit`,{method:'POST',body:{transaction,writes}});}
  async function runTransaction(work){
    for(let attempt=0;attempt<3;attempt++){
      const transaction=await beginTransaction();
      const writes=[];
      const tx={
        get:ref=>batchGet(ref,transaction),
        set(ref,value){writes.push({update:{name:ref._name,fields:encodeFields(value)}});}
      };
      try{const result=await work(tx);await commit(transaction,writes);return result;}
      catch(error){if((error.firestoreStatus==='ABORTED'||error.status===409)&&attempt<2)continue;throw error;}
    }
    throw new Error('firestore_transaction_retry_exhausted');
  }
  return {collection,runTransaction,projectId,databaseId};
}

export const firestoreCodec={encodeValue,decodeValue,encodeFields,decodeFields};