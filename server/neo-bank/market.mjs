const DEFAULT_COUNTERPARTY='https://api.counterparty.io:4000';
const COINGECKO='https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,counterparty&vs_currencies=usd';
const MEMPOOL='https://mempool.space/api/v1/prices';

async function getJson(fetchImpl,url){
  const response=await fetchImpl(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(8000)});
  if(!response.ok) throw new Error(`upstream_${response.status}`);
  return response.json();
}

function items(value){return Array.isArray(value)?value:(value?.result||[])}
function amount(value){const number=Number(value||0);return Number.isFinite(number)?number:0}

export function quoteFromOrders(rawOrders){
  const bids=[],asks=[];
  for(const order of items(rawOrders)){
    const give=String(order.give_asset||'').toUpperCase(),get=String(order.get_asset||'').toUpperCase();
    const giveQty=amount(order.give_remaining??order.give_quantity),getQty=amount(order.get_remaining??order.get_quantity);
    if(give==='NOMNI'&&get==='XCP'&&giveQty>0&&getQty>0) asks.push(getQty/giveQty);
    if(give==='XCP'&&get==='NOMNI'&&giveQty>0&&getQty>0) bids.push(giveQty/getQty);
  }
  const bestBid=bids.length?Math.max(...bids):0,bestAsk=asks.length?Math.min(...asks):0;
  if(!bestBid&&!bestAsk) return null;
  return {bestBid,bestAsk,nomniXcp:bestBid&&bestAsk?(bestBid+bestAsk)/2:(bestBid||bestAsk),method:bestBid&&bestAsk?'order-book-midpoint':'one-sided-order-book'};
}

export async function getNomniValuation({fetchImpl=fetch,counterpartyBase=process.env.NEO_BANK_COUNTERPARTY_API||DEFAULT_COUNTERPARTY,now=()=>new Date().toISOString()}={}){
  try{
    const [ordersResult,coinResult,btcResult]=await Promise.allSettled([
      getJson(fetchImpl,`${counterpartyBase.replace(/\/$/,'')}/v2/orders/NOMNI/XCP?status=open&limit=1000`),
      getJson(fetchImpl,COINGECKO),
      getJson(fetchImpl,MEMPOOL)
    ]);
    const quote=ordersResult.status==='fulfilled'?quoteFromOrders(ordersResult.value):null;
    const coins=coinResult.status==='fulfilled'?coinResult.value:{};
    const fallback=btcResult.status==='fulfilled'?btcResult.value:{};
    const xcpUsd=Number(coins?.counterparty?.usd||0),btcUsd=Number(coins?.bitcoin?.usd||fallback?.USD||0);
    if(!quote||!xcpUsd) return {available:false,nomniUsd:null,reason:'No defensible live NOMNI/XCP quote is currently available.',xcpUsd:xcpUsd||null,btcUsd:btcUsd||null,observedAt:now()};
    const nomniUsd=quote.nomniXcp*xcpUsd;
    return {available:true,pair:'NOMNI/XCP',nomniUsd,nomniXcp:quote.nomniXcp,nomniBtc:btcUsd?nomniUsd/btcUsd:null,xcpUsd,btcUsd:btcUsd||null,bestBid:quote.bestBid||null,bestAsk:quote.bestAsk||null,method:quote.method,source:'Counterparty open order book + CoinGecko spot rate',observedAt:now()};
  }catch(error){return {available:false,nomniUsd:null,reason:'Live market sources could not be reached.',observedAt:now()}}
}
