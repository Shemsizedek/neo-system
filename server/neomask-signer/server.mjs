import http from 'node:http'
import {registerSigner,createPairingChallenge,verifyPairingChallenge,guardianFirewall,requestSignature,signerNetworkSnapshot} from './fabric.mjs'

const PORT=Number(process.env.PORT||8810),TOKEN=String(process.env.NEOMASK_SIGNER_OPERATOR_TOKEN||'')
const signers=[],pairings=[]
let blocked=0,approved=0
const json=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(body))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const chunks=[];for await(const c of req)chunks.push(c);return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{}}
export function createSignerServer(){return http.createServer(async(req,res)=>{try{
 const url=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'neomask-signer-network',signers:signers.length})
 if(req.method==='GET'&&url.pathname==='/v1/estate/neomask')return json(res,200,signerNetworkSnapshot({signers,pairings,blocked,approved}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&url.pathname==='/v1/signers'){const s=registerSigner(await body(req));signers.push(s);return json(res,201,s)}
 if(req.method==='POST'&&url.pathname==='/v1/pairing/challenges'){const c=createPairingChallenge(await body(req));pairings.push(c);return json(res,201,c)}
 if(req.method==='POST'&&url.pathname==='/v1/firewall/evaluate'){const i=await body(req),s=signers.find(x=>x.signer_id===i.signer_id),g=guardianFirewall({origin:i.origin,domainSignals:i.domain_signals,transaction:i.transaction,signer:s,userPresent:i.user_present===true});g.allowed?approved++:blocked++;return json(res,200,g)}
 if(req.method==='POST'&&url.pathname==='/v1/signatures/request')return json(res,501,{error:'device_signer_adapter_required','detail':'The control plane authorizes requests but does not hold signing private keys. Use a paired device/hardware signer adapter.'})
 return json(res,404,{error:'not_found'})
}catch(error){return json(res,500,{error:'neomask_signer_error',detail:String(error?.message||error)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createSignerServer().listen(PORT,'0.0.0.0')
