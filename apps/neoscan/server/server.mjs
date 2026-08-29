import http from 'node:http';
import {createStatementsService} from './statements-service.mjs';

const DEFAULT_PUBLIC_ORIGIN='https://shemsizedek.github.io';
const DEFAULT_PORT=8788;

function parseOriginList(value){
  return String(value||DEFAULT_PUBLIC_ORIGIN).split(',').map(v=>v.trim()).filter(Boolean);
}

function validateEnv(env=process.env){
  const errors=[];
  const warnings=[];
  const port=Number(env.PORT||DEFAULT_PORT);
  if(!Number.isInteger(port)||port<1||port>65535)errors.push('PORT must be an integer between 1 and 65535');
  const allowedOrigins=parseOriginList(env.NEOSCAN_PUBLIC_ORIGIN);
  for(const origin of allowedOrigins){
    try{const url=new URL(origin);if(!['http:','https:'].includes(url.protocol))throw new Error('protocol')}catch{errors.push(`Invalid NEOscan public origin: ${origin}`)}
  }
  const cesConfigured=Boolean(env.NEOSCAN_CES_ENDPOINT||env.NEOSCAN_CES_ACCOUNT||env.NEOSCAN_CES_TOKEN);
  if(cesConfigured){
    if(!env.NEOSCAN_CES_ENDPOINT)errors.push('NEOSCAN_CES_ENDPOINT is required when CES is enabled');
    if(!env.NEOSCAN_CES_ACCOUNT)errors.push('NEOSCAN_CES_ACCOUNT is required when CES is enabled');
    if(!env.NEOSCAN_CES_TOKEN)warnings.push('NEOSCAN_CES_TOKEN is missing; legacy CES API reads will remain disabled');
  }
  return {ok:errors.length===0,errors,warnings,port,allowedOrigins,cesConfigured};
}

const envStatus=validateEnv();
if(!envStatus.ok&&import.meta.url===`file://${process.argv[1]}`){
  console.error('NEOscan statements service configuration error:',envStatus.errors.join('; '));
  process.exitCode=1;
}

const service=createStatementsService({
  bitcoinApi:process.env.NEOSCAN_BITCOIN_API,
  counterpartyApi:process.env.NEOSCAN_COUNTERPARTY_API,
  ces:{
    endpoint:process.env.NEOSCAN_CES_ENDPOINT,
    network:process.env.NEOSCAN_CES_NETWORK,
    account:process.env.NEOSCAN_CES_ACCOUNT,
    authMode:'bearer'
  }
});

function corsHeaders(req){
  const origin=String(req.headers.origin||'');
  const allowed=envStatus.allowedOrigins.includes(origin);
  return {
    'vary':'Origin',
    ...(allowed?{'access-control-allow-origin':origin}:{})
  };
}

function send(req,res,status,payload,extraHeaders={}){
  res.writeHead(status,{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store',
    'x-content-type-options':'nosniff',
    'referrer-policy':'no-referrer',
    'x-frame-options':'DENY',
    ...corsHeaders(req),
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}

function errorEnvelope(code,message,requestId){
  return {ok:false,error:{code,message},requestId};
}

const server=http.createServer(async(req,res)=>{
  const requestId=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
  try{
    const url=new URL(req.url,'http://localhost');
    const origin=String(req.headers.origin||'');
    if(origin&&!envStatus.allowedOrigins.includes(origin))return send(req,res,403,errorEnvelope('origin_not_allowed','Origin is not allowed',requestId));
    if(req.method==='OPTIONS')return send(req,res,204,{}, {'access-control-allow-methods':'GET, OPTIONS','access-control-allow-headers':'content-type','access-control-max-age':'600'});
    if(req.method==='GET'&&url.pathname==='/health')return send(req,res,200,{ok:true,status:'live',requestId,...service.publicStatus()});
    if(req.method==='GET'&&url.pathname==='/ready'){
      if(!envStatus.ok)return send(req,res,503,{ok:false,status:'not-ready',requestId,errors:envStatus.errors});
      return send(req,res,200,{ok:true,status:'ready',requestId,warnings:envStatus.warnings,...service.publicStatus()});
    }
    if(req.method==='GET'&&url.pathname==='/v1/operations/ces'){
      return send(req,res,200,{ok:true,requestId,data:service.cesStatus()});
    }
    if(req.method==='GET'&&url.pathname==='/v1/statements'){
      if(!envStatus.ok)return send(req,res,503,errorEnvelope('service_not_ready','Statement service configuration is invalid',requestId));
      const address=String(url.searchParams.get('address')||'').trim();
      if(!address)return send(req,res,400,errorEnvelope('invalid_request','address is required',requestId));
      if(address.length>120)return send(req,res,400,errorEnvelope('invalid_request','address is too long',requestId));
      const cesToken=process.env.NEOSCAN_CES_TOKEN||null;
      const statement=await service.buildPublicStatement({address,cesToken,includeCes:true});
      return send(req,res,200,{ok:true,requestId,data:statement});
    }
    return send(req,res,404,errorEnvelope('not_found','Route not found',requestId));
  }catch(error){
    console.error('NEOscan statements request failed',{requestId,message:String(error?.message||error)});
    return send(req,res,502,errorEnvelope('upstream_unavailable','Statement service is temporarily unavailable',requestId));
  }
});

if(import.meta.url===`file://${process.argv[1]}`&&envStatus.ok){
  server.listen(envStatus.port,()=>console.log(`NEOscan statements service listening on ${envStatus.port}`));
}

export {server,service,validateEnv,parseOriginList};
