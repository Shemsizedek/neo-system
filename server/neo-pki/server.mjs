import http from 'node:http'
import crypto from 'node:crypto'
import policy from '../../architecture/neo-sovereign-identity-policy.json' with {type:'json'}
import {createCaIdentity,createCertificateRequest,issueIdentityCredential,verifyIdentityCredential,revokeCredential,rotationState,buildX509IssuanceRequest,pkiSnapshot} from './fabric.mjs'

const PORT=Number(process.env.PORT||8801)
const TOKEN=String(process.env.NEO_PKI_OPERATOR_TOKEN||'')
const CA_PRIVATE_KEY_PEM=String(process.env.NEO_PKI_ISSUER_PRIVATE_KEY_PEM||'')
const CA_PUBLIC_KEY_PEM=String(process.env.NEO_PKI_ISSUER_PUBLIC_KEY_PEM||'')
const ISSUER_ID=String(process.env.NEO_PKI_ISSUER_ID||'estate-intermediate-1')
const credentials=new Map(),revocations=[]
const json=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const chunks=[];for await(const c of req)chunks.push(c);return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{}}
const issuer=()=>createCaIdentity({id:ISSUER_ID,publicKey:CA_PUBLIC_KEY_PEM})
const privateKey=()=>crypto.createPrivateKey(CA_PRIVATE_KEY_PEM)

export function createPkiServer(){
 return http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url||'/','http://neo.local')
   if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'neo-pki',issuer_configured:Boolean(CA_PUBLIC_KEY_PEM),credentials:credentials.size})
   if(req.method==='GET'&&url.pathname==='/v1/estate/identity')return json(res,200,pkiSnapshot({issuers:CA_PUBLIC_KEY_PEM?[issuer()]:[],credentials:[...credentials.values()],revocations}))
   if(req.method==='POST'&&url.pathname==='/v1/certificates/issue'){
    if(!auth(req))return json(res,401,{error:'operator_auth_required'})
    if(!CA_PRIVATE_KEY_PEM||!CA_PUBLIC_KEY_PEM)return json(res,503,{error:'ca_key_unavailable'})
    const input=await body(req),request=createCertificateRequest(input.request||input)
    const cred=issueIdentityCredential({request,issuer:issuer(),issuerPrivateKey:privateKey(),policy,attestedNodes:Array.isArray(input.attested_nodes)?input.attested_nodes:[]})
    credentials.set(cred.serial,cred)
    return json(res,201,{credential:cred,x509:buildX509IssuanceRequest({credentialRequest:request,credential:cred})})
   }
   const get=url.pathname.match(/^\/v1\/certificates\/([^/]+)$/)
   if(req.method==='GET'&&get){
    if(!auth(req))return json(res,401,{error:'operator_auth_required'})
    const cred=credentials.get(decodeURIComponent(get[1]));if(!cred)return json(res,404,{error:'credential_not_found'})
    return json(res,200,{credential:cred,verification:verifyIdentityCredential({credential:cred,issuer:issuer(),revocations}),rotation:rotationState({credential:cred,policy})})
   }
   const revoke=url.pathname.match(/^\/v1\/certificates\/([^/]+)\/revoke$/)
   if(req.method==='POST'&&revoke){
    if(!auth(req))return json(res,401,{error:'operator_auth_required'})
    const cred=credentials.get(decodeURIComponent(revoke[1]));if(!cred)return json(res,404,{error:'credential_not_found'})
    const input=await body(req),row=revokeCredential({credential:cred,reason:input.reason||'operator_revocation',actor:'neo-pki'})
    revocations.push(row);return json(res,200,{revocation:row})
   }
   return json(res,404,{error:'not_found'})
  }catch(error){return json(res,500,{error:'neo_pki_error',detail:String(error?.message||error)})}
 })
}
if(import.meta.url===`file://${process.argv[1]}`)createPkiServer().listen(PORT,'0.0.0.0')
