const API_ROOT='https://api.counterparty.io:4000/v2';
const PAIRS=Object.freeze(['NOMNI/XCP','NOMNI/BTC']);
const TIMEOUT_MS=5000;
const MAX_BYTES=65536;
const CACHE_MS=45000;

async function getJson(url,fetchImpl) {
  const abort=new AbortController();
  const timer=setTimeout(()=>abort.abort(),TIMEOUT_MS);
  try {
    const response=await fetchImpl(url,{headers:{accept:'application/json','user-agent':'NEO-CROWN-evidence/1'},signal:abort.signal,redirect:'error'});
    if(!response.ok)throw new Error('upstream_'+response.status);
    const length=Number(response.headers?.get?.('content-length')??0);
    if(Number.isFinite(length)&&length>MAX_BYTES)throw new Error('response_too_large');
    const reader=response.body?.getReader?.();
    if(!reader)throw new Error('stream_required');
    const chunks=[];let total=0;
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      total+=value.byteLength;
      if(total>MAX_BYTES){await reader.cancel();throw new Error('response_too_large');}
      chunks.push(value);
    }
    const merged=new Uint8Array(total);let p=0;
    for(const chunk of chunks){merged.set(chunk,p);p+=chunk.byteLength;}
    return JSON.parse(new TextDecoder().decode(merged));
  } finally {clearTimeout(timer);}
}
const goodHash=h=>typeof h==='string'&&/^[a-f0-9]{64}$/i.test(h);
const goodHeight=h=>Number.isSafeInteger(h)&&h>0&&h<10000000;
const iso=unix=>Number.isSafeInteger(unix)&&unix>1231006505&&unix<4102444800?new Date(unix*1000).toISOString():null;
function responseBase(at){return {schema:'neo.crown.counterparty.order-evidence.v1',network:'bitcoin-mainnet',provider:'Counterparty Core API v2',read_only:true,checked_at:at,price:null,market_quote_verified:false,notice:'Order-book listings do not establish a last-trade price, reserve backing, asset ownership or executable liquidity.'};}

export function createCounterpartyEvidenceService({fetchImpl=globalThis.fetch,now=()=>new Date()}={}) {
  let cache=null,pending=null;
  async function observe(){
    const nowDate=new Date(now()),nowMs=nowDate.getTime(),base=responseBase(nowDate.toISOString());
    if(cache&&nowMs>=cache.at&&nowMs-cache.at<CACHE_MS)return cache.result;
    if(pending)return pending;
    pending=(async()=>{
      const pairs=[];
      for(const pair of PAIRS){
        const url=API_ROOT+'/orders/'+pair+'?status=open&limit=20';
        try{
          const body=await getJson(url,fetchImpl);
          if(!Array.isArray(body?.result)||!Number.isSafeInteger(body.result_count)||body.result_count<0)throw new Error('invalid_order_payload');
          const rows=body.result;
          if(rows.length>20||rows.some(r=>r?.status!=='open'||!goodHash(r.tx_hash)||!goodHeight(r.block_index)))throw new Error('untrusted_order_payload');
          const [left,right]=pair.split('/');
          if(rows.some(r=>!([r.give_asset,r.get_asset].includes(left)&&[r.give_asset,r.get_asset].includes(right))))throw new Error('pair_mismatch');
          const distinct=[...new Set(rows.map(r=>r.block_index))].slice(0,5);
          const blocks=[];
          for(const height of distinct){
            try{
              const b=await getJson(API_ROOT+'/blocks/'+height,fetchImpl);
              const block=b?.result;
              if(block?.block_index!==height||!goodHash(block.block_hash)||!iso(block.block_time))throw new Error('invalid_block_evidence');
              blocks.push({block_index:height,block_hash:block.block_hash,block_time:iso(block.block_time),source_url:API_ROOT+'/blocks/'+height});
            }catch{blocks.push({block_index:height,block_time:null,source_url:API_ROOT+'/blocks/'+height,verification:'unavailable'});}
          }
          const byHeight=new Map(blocks.map(x=>[x.block_index,x]));
          const sample=rows.slice(0,5).map(row=>({
            tx_hash:row.tx_hash,block_index:row.block_index,order_creation_block_time:byHeight.get(row.block_index)?.block_time||null,
            give_asset:row.give_asset,get_asset:row.get_asset,
            status:'open',order_type:'open_listing',executed_trade:false
          }));
          pairs.push({pair,status:body.result_count===0?'no_open_orders':'open_listings_present',
            open_order_count:body.result_count,returned:rows.length,truncated:body.result_count>rows.length,
            source_url:url,orders:sample,blocks,price:null,price_verified:false});
        }catch(error){
          pairs.push({pair,status:'unavailable',open_order_count:null,returned:0,
            source_url:url,orders:[],blocks:[],price:null,price_verified:false,
            reason:'provider_unavailable_or_invalid'});
        }
      }
      const result={...base,pairs,source_status:pairs.every(p=>p.status==='unavailable')?'unavailable':pairs.some(p=>p.status==='unavailable')?'partial':'observed'};
      cache={at:nowMs,result};return result;
    })();
    try{return await pending;}finally{pending=null;}
  }
  return {observe};
}
export {PAIRS};
