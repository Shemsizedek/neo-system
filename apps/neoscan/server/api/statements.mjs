import {createStatementsService} from '../statements-service.mjs';

const service=createStatementsService({
  bitcoinApi:process.env.NEOSCAN_BITCOIN_API,
  counterpartyApi:process.env.NEOSCAN_COUNTERPARTY_API,
  ces:{endpoint:process.env.NEOSCAN_CES_ENDPOINT,network:process.env.NEOSCAN_CES_NETWORK,account:process.env.NEOSCAN_CES_ACCOUNT,authMode:'bearer'}
});

function originAllowed(origin){
  const allowed=String(process.env.NEOSCAN_PUBLIC_ORIGINS||process.env.NEOSCAN_PUBLIC_ORIGIN||'https://shemsizedek.github.io').split(',').map(v=>v.trim()).filter(Boolean);
  return !origin||allowed.includes(origin);
}

function headers(req){
  const origin=req.headers?.origin;
  return {
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store',
    'x-content-type-options':'nosniff',
    ...(origin&&originAllowed(origin)?{'access-control-allow-origin':origin,'vary':'Origin'}:{})
  };
}

export default async function handler(req,res){
  const h=headers(req);
  Object.entries(h).forEach(([k,v])=>res.setHeader(k,v));
  if(req.method==='OPTIONS'){
    if(!originAllowed(req.headers?.origin))return res.status(403).json({error:'origin not allowed'});
    res.setHeader('access-control-allow-methods','GET,OPTIONS');
    res.setHeader('access-control-allow-headers','content-type');
    return res.status(204).end();
  }
  if(req.method!=='GET')return res.status(405).json({error:'method not allowed'});
  if(!originAllowed(req.headers?.origin))return res.status(403).json({error:'origin not allowed'});
  const address=String(req.query?.address||'').trim();
  if(!address)return res.status(400).json({error:'address is required'});
  try{
    const cesToken=process.env.NEOSCAN_CES_TOKEN||null;
    const statement=await service.buildPublicStatement({address,cesToken,includeCes:Boolean(cesToken)});
    return res.status(200).json(statement);
  }catch{
    return res.status(502).json({error:'statement service unavailable'});
  }
}
