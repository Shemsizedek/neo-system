import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {createNibiruReserve} from './nibiru.mjs';

const json=(res,status,body)=>{const payload=JSON.stringify(body);res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(payload),'access-control-allow-origin':'*','cache-control':'no-store'});res.end(payload)};
const read=async req=>{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>65536)throw new Error('request_too_large');chunks.push(chunk)}return JSON.parse(Buffer.concat(chunks).toString()||'{}')};

export function createNibiruReserveServer({nibiru=createNibiruReserve()}={}){
 return http.createServer(async(req,res)=>{try{
  if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,authorization'});return res.end()}
  const url=new URL(req.url||'/','http://neo.local');
  if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'nibiru-reserve-system',mode:'ORIGIN_SANDBOX'});
  if(req.method==='GET'&&url.pathname==='/api/v1/nibiru/capabilities')return json(res,200,nibiru.capabilities());
  if(req.method==='GET'&&url.pathname==='/api/v1/nibiru/reserve-snapshot')return json(res,200,nibiru.reserveSnapshot());
  if(req.method==='POST'&&url.pathname==='/api/v1/nibiru/ces/positions')return json(res,201,nibiru.recordCesPosition(await read(req)));
  const link=url.pathname.match(/^\/api\/v1\/nibiru\/ces\/positions\/([^/]+)\/blockchain-settlement$/);
  if(req.method==='POST'&&link){const row=nibiru.linkBlockchainSettlement(link[1],await read(req));return row?json(res,200,row):json(res,404,{error:'position_not_found'})}
  if(req.method==='POST'&&url.pathname==='/api/v1/nibiru/iso20022/payment-envelopes')return json(res,201,nibiru.createIsoPaymentEnvelope(await read(req)));
  return json(res,404,{error:'not_found'});
 }catch(error){return json(res,error.message==='request_too_large'?413:400,{error:error.message})}})
}
export function startNibiruReserveServer({port=Number(process.env.NIBIRU_RESERVE_PORT||8795)}={}){const server=createNibiruReserveServer();server.listen(port,()=>console.log(`Nibiru Reserve sandbox listening on :${port}`));return server}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)startNibiruReserveServer();
