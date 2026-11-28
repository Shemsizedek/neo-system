import {createUpstashReceiptStore,processBitflowsRequest} from '../../../server/neo-router/bitflows-intake.mjs'
export const config={api:{bodyParser:false}}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'method_not_allowed'})}
  if(process.env.NEO_BITFLOWS_ENABLED!=='true')return res.status(503).json({error:'integration_disabled'})
  const chunks=[];let bytes=0
  try{
    for await(const chunk of req){bytes+=chunk.length;if(bytes>16384)return res.status(413).json({error:'payload_too_large'});chunks.push(chunk)}
    const store=createUpstashReceiptStore({url:process.env.UPSTASH_REDIS_REST_URL,token:process.env.UPSTASH_REDIS_REST_TOKEN})
    const result=await processBitflowsRequest({method:req.method,headers:req.headers,rawBody:Buffer.concat(chunks).toString('utf8'),env:process.env,store})
    return res.status(result.status).json(result.body)
  }catch{return res.status(503).json({error:'intake_unavailable'})}
}
