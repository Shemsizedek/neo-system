const json=(res,status,body)=>res.status(status).setHeader('Cache-Control','no-store').json(body)
const base=()=>String(process.env.TMNLF_RUNTIME_URL||'').replace(/\/$/,'')
async function proxy(req,res,path){
 const root=base();if(!root)return json(res,503,{ok:false,error:'tmnlf_runtime_unbound',persistent:false})
 const headers={'Content-Type':'application/json'};if(process.env.TMNLF_API_TOKEN)headers.Authorization=`Bearer ${process.env.TMNLF_API_TOKEN}`;headers['X-Operator']='vercel-adapter'
 const upstream=await fetch(`${root}${path}`,{method:req.method,headers,body:req.method==='GET'?undefined:JSON.stringify(req.body||{})})
 const payload=await upstream.json().catch(()=>({error:'invalid_upstream_response'}));return json(res,upstream.status,payload)
}
export default async function handler(req,res){if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return json(res,405,{ok:false,error:'method_not_allowed'})}return proxy(req,res,'/matters')}
