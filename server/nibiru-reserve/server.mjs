import http from 'node:http';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createNibiruReserve} from './nibiru.mjs';
import {NibiruPersistentStore,persistNibiru} from './persistentStore.mjs';
import {loadNibiruRuntimeConfig} from './runtimeConfig.mjs';
import {createXmllintValidator} from './xsdValidator.mjs';

const json=(res,status,body)=>{const payload=JSON.stringify(body);res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(payload),'access-control-allow-origin':'*','cache-control':'no-store'});res.end(payload)};
const read=async req=>{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>65536)throw new Error('request_too_large');chunks.push(chunk)}return JSON.parse(Buffer.concat(chunks).toString()||'{}')};

export function createNibiruReserveServer({nibiru=createNibiruReserve()}={}){
 return http.createServer(async(req,res)=>{try{
  if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,authorization'});return res.end()}
  const url=new URL(req.url||'/','http://neo.local');
  if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'nibiru-reserve-system',mode:'ORIGIN_SANDBOX'});
  if(req.method==='GET'&&url.pathname==='/api/v1/nibiru/capabilities')return json(res,200,nibiru.capabilities());
  if(req.method==='GET'&&url.pathname==='/api/v1/nibiru/reserve-snapshot')return json(res,200,nibiru.reserveSnapshot());
  if(req.method==='GET'&&url.pathname==='/api/v1/nibiru/trial-balance')return json(res,200,nibiru.ledger.trialBalance());
  if(req.method==='GET'&&url.pathname==='/api/v1/nibiru/reconciliation')return json(res,200,nibiru.reconciler.snapshot());
  if(req.method==='GET'&&url.pathname==='/api/v1/nibiru/audit')return json(res,200,{events:nibiru.store?.audit(Number(url.searchParams.get('limit')||200))||[]});
  if(req.method==='POST'&&url.pathname==='/api/v1/nibiru/ces/positions')return json(res,201,nibiru.recordCesPosition(await read(req)));
  const link=url.pathname.match(/^\/api\/v1\/nibiru\/ces\/positions\/([^/]+)\/blockchain-settlement$/);
  if(req.method==='POST'&&link){const row=nibiru.linkBlockchainSettlement(link[1],await read(req));return row?json(res,200,row):json(res,404,{error:'position_not_found'})}
  if(req.method==='POST'&&url.pathname==='/api/v1/nibiru/iso20022/payment-envelopes')return json(res,201,nibiru.createIsoPaymentEnvelope(await read(req)));
  if(req.method==='POST'&&url.pathname==='/api/v1/nibiru/settlements')return json(res,201,nibiru.reconciler.observe(await read(req)));
  const reconcile=url.pathname.match(/^\/api\/v1\/nibiru\/settlements\/([^/]+)\/reconcile$/);
  if(req.method==='POST'&&reconcile){const row=nibiru.reconciler.reconcile(reconcile[1],await read(req));return row?json(res,200,row):json(res,404,{error:'settlement_not_found'})}
  if(req.method==='POST'&&url.pathname==='/api/v1/nibiru/recognition-assessments')return json(res,201,nibiru.recognition.assess(await read(req)));
  if(req.method==='POST'&&url.pathname==='/api/v1/nibiru/attestations/verify')return json(res,201,nibiru.attestations.verify(await read(req)));
  const approve=url.pathname.match(/^\/api\/v1\/nibiru\/recognition-assessments\/([^/]+)\/approve$/);
  if(req.method==='POST'&&approve){const row=nibiru.recognition.approve(approve[1],await read(req));return row?json(res,200,row):json(res,404,{error:'assessment_not_found'})}
  const render=url.pathname.match(/^\/api\/v1\/nibiru\/iso20022\/payment-envelopes\/([^/]+)\/xml$/);
  if(req.method==='GET'&&render){const row=nibiru.renderIsoPayment(render[1]);return row?json(res,200,row):json(res,404,{error:'message_not_found'})}
  const validate=url.pathname.match(/^\/api\/v1\/nibiru\/iso20022\/payment-envelopes\/([^/]+)\/xsd-validation$/);
  if(req.method==='GET'&&validate){const row=await nibiru.validateIsoPayment(validate[1]);return row?json(res,200,row):json(res,404,{error:'message_not_found'})}
  return json(res,404,{error:'not_found'});
 }catch(error){return json(res,error.message==='request_too_large'?413:400,{error:error.message})}})
}
export function startNibiruReserveServer({port=Number(process.env.NIBIRU_RESERVE_PORT||8795),dbPath=process.env.NIBIRU_RESERVE_DB_PATH,runtimeConfig}={}){
 const productionRequested=runtimeConfig||['NIBIRU_TRUST_KEYS_PATH','NIBIRU_ISO_XSD_PATH','NIBIRU_ISO_XSD_SHA256'].some(key=>process.env[key]);
 const config=runtimeConfig||(productionRequested?loadNibiruRuntimeConfig():null);
 const store=new NibiruPersistentStore(config?.dbPath||dbPath);
 const isoXsd=config?{schemaBytes:readFileSync(config.isoSchemaPath),expectedSha256:config.isoSchemaSha256,validator:createXmllintValidator({schemaPath:config.isoSchemaPath,executable:config.xsdExecutable})}:null;
 const nibiru=persistNibiru(createNibiruReserve({trustedAttestationKeys:config?.trustedPublicKeys||{},isoXsd}),store);nibiru.store=store;
 const server=createNibiruReserveServer({nibiru});server.on('close',()=>store.close());server.listen(port,()=>console.log(`Nibiru Reserve ${config?'production-configured':'sandbox'} listening on :${port}`));return server
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)startNibiruReserveServer();
