import {createStatementsService} from '../statements-service.mjs';

const service=createStatementsService({
  bitcoinApi:process.env.NEOSCAN_BITCOIN_API,
  counterpartyApi:process.env.NEOSCAN_COUNTERPARTY_API,
  ces:{endpoint:process.env.NEOSCAN_CES_ENDPOINT,network:process.env.NEOSCAN_CES_NETWORK,account:process.env.NEOSCAN_CES_ACCOUNT,authMode:'bearer'}
});

export default function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'method not allowed'});
  res.setHeader('cache-control','no-store');
  res.setHeader('x-content-type-options','nosniff');
  return res.status(200).json({ok:true,...service.publicStatus()});
}
