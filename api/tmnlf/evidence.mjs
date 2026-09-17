import crypto from 'node:crypto'
const store=globalThis.__tmnlfEvidenceStore??{items:[],audit:[]}
globalThis.__tmnlfEvidenceStore=store
const json=(res,status,body)=>res.status(status).setHeader('Cache-Control','no-store').json(body)
export default async function handler(req,res){
 if(req.method==='GET') return json(res,200,{ok:true,items:store.items,auditCount:store.audit.length})
 if(req.method==='POST'){
  const {matterId,label,content,source}=req.body||{}
  if(!matterId||!label||!content) return json(res,400,{ok:false,error:'matterId_label_content_required'})
  const digest=crypto.createHash('sha256').update(String(content)).digest('hex')
  const item={id:`EVD-${String(store.items.length+1).padStart(4,'0')}`,matterId:String(matterId),label:String(label),source:String(source||'direct-intake'),sha256:digest,classification:'UNKNOWN',verificationStatus:'UNVERIFIED',createdAt:new Date().toISOString()}
  store.items.push(item);store.audit.push({at:item.createdAt,action:'EVIDENCE_REGISTERED',matterId:item.matterId,evidenceId:item.id,sha256:digest})
  return json(res,201,{ok:true,item})
 }
 res.setHeader('Allow','GET, POST');return json(res,405,{ok:false,error:'method_not_allowed'})
}
