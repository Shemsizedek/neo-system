import http from 'node:http';
import { listMiningSources, MINING_SOURCE_TYPES } from './sourceRegistry.mjs';

const PORT=Number(process.env.PORT||8080);

function send(res,status,body){
  const payload=JSON.stringify(body);
  res.writeHead(status,{
    'content-type':'application/json; charset=utf-8',
    'content-length':Buffer.byteLength(payload),
    'cache-control':'no-store',
    'x-content-type-options':'nosniff'
  });
  res.end(payload);
}

function snapshot(){
  return {
    service:'neo-generator',
    name:'NEO Generator',
    mode:'PUBLIC_READ_ONLY',
    role:'mining-contract-and-compute-orchestration',
    purchasesEnabled:false,
    settlementEnabled:false,
    generationAuthorityBypass:false,
    liveProfitabilityInputsConnected:false,
    policy:'No contract, quote, profitability, revenue, or capacity value is fabricated when authoritative live inputs are unavailable.'
  };
}

export function createGeneratorServer(){
  return http.createServer((req,res)=>{
    const url=new URL(req.url||'/','http://neo-generator.local');
    if(req.method!=='GET'){
      res.setHeader('allow','GET');
      return send(res,405,{error:'method_not_allowed',service:'neo-generator'});
    }
    if(url.pathname==='/health') return send(res,200,{ok:true,...snapshot()});
    if(url.pathname==='/ready') return send(res,200,{ok:true,...snapshot(),runtime:'standalone-http',optimizerLoaded:true});
    if(url.pathname==='/'||url.pathname==='/api') return send(res,200,{
      ...snapshot(),
      endpoints:['/health','/ready','/products','/contracts','/capacity','/hashpower-quotes','/sources']
    });
    if(url.pathname==='/sources') return send(res,200,{
      mode:'PUBLIC_READ_ONLY',
      sourceTypes:Object.values(MINING_SOURCE_TYPES),
      sources:listMiningSources().map(({adapter,...source})=>({...source,adapterConfigured:Boolean(adapter)}))
    });
    if(url.pathname==='/products') return send(res,200,{
      mode:'PUBLIC_READ_ONLY',
      data:[],
      count:0,
      status:'NO_PUBLIC_PRODUCTS_PUBLISHED',
      note:'No public Generator mining products have been published from an authoritative catalog.'
    });
    if(url.pathname==='/contracts') return send(res,200,{
      mode:'PUBLIC_READ_ONLY',
      data:[],
      count:0,
      status:'NO_PUBLIC_CONTRACTS',
      note:'Contract activation and settlement require authenticated backend execution and approved commercial terms.'
    });
    if(url.pathname==='/capacity') return send(res,200,{
      mode:'PUBLIC_READ_ONLY',
      available:false,
      totalHashrateTh:null,
      reserveHashrateTh:null,
      allocatableHashrateTh:null,
      status:'LIVE_MINER_TELEMETRY_NOT_CONNECTED',
      note:'Authoritative capacity is unavailable until verified NEO Miner telemetry is bound to Generator.'
    });
    if(url.pathname==='/hashpower-quotes') return send(res,200,{
      mode:'PUBLIC_READ_ONLY',
      available:false,
      quotes:[],
      status:'LIVE_QUOTE_INPUTS_NOT_CONNECTED',
      requiredInputs:['network difficulty','pool payout data','BTC price','electricity rate','verified miner telemetry'],
      note:'No synthetic profitability or hashpower quote is emitted without authoritative live inputs.'
    });
    return send(res,404,{error:'not_found',service:'neo-generator',path:url.pathname});
  });
}

if(import.meta.url===`file://${process.argv[1]}`){
  createGeneratorServer().listen(PORT,'0.0.0.0',()=>console.log(`NEO Generator listening on 0.0.0.0:${PORT}`));
}
