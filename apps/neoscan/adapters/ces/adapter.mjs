export const CES_SCHEMA='neo.ces.adapter.v1';

export function createCesAdapter(config={}){
  const endpoint=String(config.endpoint||'').trim();
  const network=String(config.network||'').trim();
  const account=String(config.account||'').trim();
  const authMode=String(config.authMode||'bearer').trim();

  function status(){
    const configured=Boolean(endpoint&&account);
    return {schema:CES_SCHEMA,configured,endpoint:configured?endpoint:null,network:network||null,account:account||null,authMode,readOnly:true};
  }

  async function fetchJson(path,{token,signal}={}){
    if(!endpoint||!account)throw new Error('CES adapter is not configured');
    if(!token)throw new Error('CES authentication token is required');
    const url=new URL(path,endpoint.endsWith('/')?endpoint:`${endpoint}/`);
    const headers={accept:'application/json'};
    if(authMode==='bearer')headers.authorization=`Bearer ${token}`;
    const response=await fetch(url,{headers,signal});
    if(!response.ok)throw new Error(`CES upstream returned ${response.status}`);
    return response.json();
  }

  function normalizeEntry(row={}){
    const reference=String(row.reference??row.id??row.transaction_id??'').trim();
    const unit=String(row.unit??row.currency??row.asset??'').trim();
    const amount=Number(row.amount??row.quantity??row.value);
    const observedAt=String(row.observedAt??row.timestamp??row.created_at??'').trim();
    if(!reference||!unit||!Number.isFinite(amount)||!observedAt)throw new Error('CES record missing required provenance fields');
    return {source:'ces',reference,unit,amount,observedAt,verificationStatus:'verified',network:network||null,account};
  }

  async function getBalance({token,signal}={}){
    const data=await fetchJson(`accounts/${encodeURIComponent(account)}/balance`,{token,signal});
    const unit=String(data.unit??data.currency??'').trim();
    const amount=Number(data.amount??data.balance);
    const reference=String(data.reference??data.snapshot_id??`balance:${account}`).trim();
    const observedAt=String(data.observedAt??data.timestamp??data.as_of??'').trim();
    if(!unit||!Number.isFinite(amount)||!observedAt)throw new Error('CES balance response missing required provenance fields');
    return {source:'ces',reference,unit,amount,observedAt,verificationStatus:'verified',network:network||null,account,recordType:'balance'};
  }

  async function getTransactions({token,signal,limit=100}={}){
    const data=await fetchJson(`accounts/${encodeURIComponent(account)}/transactions?limit=${Math.max(1,Math.min(Number(limit)||100,500))}`,{token,signal});
    const rows=Array.isArray(data)?data:(data.results??data.transactions??[]);
    if(!Array.isArray(rows))throw new Error('CES transaction response must be an array');
    return rows.map(normalizeEntry);
  }

  return {status,getBalance,getTransactions,normalizeEntry};
}
