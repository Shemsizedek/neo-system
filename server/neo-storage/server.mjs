import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {createFilesystemStorage,createStorageObject,verifyStoredObject,addReplica,replicationState,verifyExportBundle} from './fabric.mjs'
import policy from '../../architecture/neo-storage-fabric-policy.json' with {type:'json'}

const PORT=Number(process.env.PORT||8799)
const ROOT=process.env.NEO_STORAGE_ROOT||'data/neo-storage'
const TOKEN=String(process.env.NEO_STORAGE_OPERATOR_TOKEN||'')
const KEY_HEX=String(process.env.NEO_STORAGE_MASTER_KEY_HEX||'')
const store=createFilesystemStorage(ROOT)
const json=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const key=()=>{const b=Buffer.from(KEY_HEX,'hex');if(b.length!==32)throw new Error('storage_master_key_unavailable');return b}
const body=async req=>{const chunks=[];for await(const c of req)chunks.push(c);return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{}}

export function createStorageServer(){
 return http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url||'/','http://neo.local')
   if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'neo-storage-fabric',objects:store.list().length})
   if(req.method==='GET'&&url.pathname==='/v1/estate/storage'){
    const objects=store.list();return json(res,200,{estate:'Global Vast Estate',designation:'Feodous Oprum Trust',storage:{objects:objects.length,bytes:objects.reduce((n,x)=>n+Number(x.size_bytes||0),0),classes:Object.fromEntries(Object.keys(policy.classes).map(c=>[c,objects.filter(x=>x.storage_class===c).length]))}})
   }
   if(req.method==='POST'&&url.pathname==='/v1/objects'){
    if(!auth(req))return json(res,401,{error:'operator_auth_required'})
    const input=await body(req),bytes=Buffer.from(String(input.data_base64||''),'base64')
    const obj=createStorageObject({bytes,storageClass:input.storage_class||'APPLICATION_DATA',mediaType:input.media_type,source:input.source,key:key(),policy})
    const metadata=store.put(obj);return json(res,201,{ok:true,object:metadata})
   }
   const get=url.pathname.match(/^\/v1\/objects\/([a-f0-9]{64})$/)
   if(req.method==='GET'&&get){
    if(!auth(req))return json(res,401,{error:'operator_auth_required'})
    const obj=store.get(get[1]);if(!obj)return json(res,404,{error:'object_not_found'})
    const verification=verifyStoredObject(obj,{key:key()})
    return json(res,200,{object:{...obj,ciphertext:undefined},verification})
   }
   const replica=url.pathname.match(/^\/v1\/objects\/([a-f0-9]{64})\/replicas$/)
   if(req.method==='POST'&&replica){
    if(!auth(req))return json(res,401,{error:'operator_auth_required'})
    const existing=store.get(replica[1]);if(!existing)return json(res,404,{error:'object_not_found'})
    const input=await body(req),updated=addReplica(existing,input)
    fs.writeFileSync(path.join(ROOT,'metadata',`${replica[1]}.json`),JSON.stringify((({ciphertext,...m})=>m)(updated),null,2)+'\n')
    return json(res,200,{replication:replicationState(updated)})
   }
   return json(res,404,{error:'not_found'})
  }catch(error){return json(res,500,{error:'neo_storage_error',detail:String(error?.message||error)})}
 })
}
if(import.meta.url===`file://${process.argv[1]}`)createStorageServer().listen(PORT,'0.0.0.0')
