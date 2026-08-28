import http from 'node:http';
import {createStatementsService} from './statements-service.mjs';

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

function send(res,status,payload){
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':process.env.NEOSCAN_PUBLIC_ORIGIN||'https://shemsizedek.github.io','x-content-type-options':'nosniff'});
  res.end(JSON.stringify(payload));
}

const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(req.method==='GET'&&url.pathname==='/health')return send(res,200,{ok:true,...service.publicStatus()});
    if(req.method==='GET'&&url.pathname==='/v1/statements'){
      const address=url.searchParams.get('address')||'';
      if(!address)return send(res,400,{error:'address is required'});
      const cesToken=process.env.NEOSCAN_CES_TOKEN||null;
      const statement=await service.buildPublicStatement({address,cesToken,includeCes:Boolean(cesToken)});
      return send(res,200,statement);
    }
    return send(res,404,{error:'not found'});
  }catch(error){return send(res,502,{error:'statement service unavailable',detail:String(error.message||error)})}
});

const port=Number(process.env.PORT||8788);
if(import.meta.url===`file://${process.argv[1]}`)server.listen(port,()=>console.log(`NEOscan statements service listening on ${port}`));

export {server,service};
