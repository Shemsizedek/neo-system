const json=(res,status,body)=>res.status(status).setHeader('Cache-Control','no-store').json(body)
const base=()=>String(process.env.TMNLF_RUNTIME_URL||'').replace(/\/$/,'')
export default async function handler(req,res){
 const root=base();if(!root)return json(res,503,{ok:false,error:'tmnlf_runtime_unbound',persistent:false})
 const matterId=String(req.query?.matterId||req.body?.matterId||'');if(!matterId)return json(res,400,{ok:false,error:'matterId_required'})
 const headers={'Content-Type':'application/json'};if(process.env.TMNLF_API_TOKEN)headers.Authorization=`Bearer ${process.env.TMNLF_API_TOKEN}`;headers['X-Operator']='vercel-adapter'
 const path=req.method==='GET'&&req.query?.view==='custody'?'/custody':'/evidence';const payload=req.method==='POST'?{label:req.body?.label,title:req.body?.label,sourceType:req.body?.source||'TMNLF_INTAKE',note:req.body?.content}:undefined
 const upstream=await fetch(`${root}/matters/${encodeURIComponent(matterId)}${path}`,{method:req.method,headers,body:payload?JSON.stringify(payload):undefined});return json(res,upstream.status,await upstream.json())
}
