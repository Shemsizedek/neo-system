const json=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra}})
const allowedRead=[
 /^\/addresses\/[13bc][A-Za-z0-9]{20,90}\/balances(?:\?.*)?$/,
 /^\/addresses\/[13bc][A-Za-z0-9]{20,90}\/transactions(?:\?.*)?$/,
 /^\/assets\/[A-Za-z0-9._-]{1,64}(?:\?.*)?$/,
 /^\/orders(?:\?.*)?$/,
 /^\/order_matches(?:\?.*)?$/,
 /^\/dispensers(?:\?.*)?$/,
 /^\/blocks(?:\?.*)?$/
]
const cors=(env,req)=>({'access-control-allow-origin':env.ALLOWED_ORIGIN||new URL(req.url).origin,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type','vary':'origin'})
const upstream=(env)=>String(env.COUNTERPARTY_API||'https://api.counterparty.io:4000/v2').replace(/\/$/,'')
const privateKeyPattern=/(private.?key|seed.?phrase|mnemonic|\bwif\b)/i

async function proxyRead(req,env,path){
 if(!allowedRead.some(r=>r.test(path))) return json({error:'Route not allowed'},404,cors(env,req))
 const r=await fetch(`${upstream(env)}${path}`,{headers:{accept:'application/json','user-agent':'NEOpay-Gateway/1.0'}})
 const text=await r.text()
 return new Response(text,{status:r.status,headers:{'content-type':r.headers.get('content-type')||'application/json','cache-control':'public, max-age=10',...cors(env,req)}})
}

async function composeOrder(req,env){
 const body=await req.json().catch(()=>null)
 if(!body||typeof body!=='object') return json({error:'Invalid JSON body'},400,cors(env,req))
 const serialized=JSON.stringify(body)
 if(privateKeyPattern.test(serialized)) return json({error:'Wallet secrets are forbidden'},400,cors(env,req))
 const {source,give_asset,give_quantity,get_asset,get_quantity,expiration=1000}=body
 if(!/^(1|3|bc1)[A-Za-z0-9]{20,90}$/.test(String(source||''))) return json({error:'Invalid source address'},400,cors(env,req))
 if(!['NOMNI','XCP'].includes(String(give_asset||'').toUpperCase())||!['NOMNI','XCP'].includes(String(get_asset||'').toUpperCase())||String(give_asset).toUpperCase()===String(get_asset).toUpperCase()) return json({error:'Only NOMNI/XCP orders are enabled'},400,cors(env,req))
 if(!Number.isFinite(Number(give_quantity))||Number(give_quantity)<=0||!Number.isFinite(Number(get_quantity))||Number(get_quantity)<=0) return json({error:'Invalid quantities'},400,cors(env,req))
 const target=`${upstream(env)}/addresses/${encodeURIComponent(source)}/compose/order`
 const r=await fetch(target,{method:'POST',headers:{'content-type':'application/json',accept:'application/json','user-agent':'NEOpay-Gateway/1.0'},body:JSON.stringify({give_asset:String(give_asset).toUpperCase(),give_quantity:Number(give_quantity),get_asset:String(get_asset).toUpperCase(),get_quantity:Number(get_quantity),expiration:Number(expiration)})})
 const text=await r.text()
 return new Response(text,{status:r.status,headers:{'content-type':r.headers.get('content-type')||'application/json','cache-control':'no-store',...cors(env,req)}})
}

async function broadcastSigned(req,env){
 const body=await req.json().catch(()=>null)
 if(!body||typeof body.signed_tx_hex!=='string') return json({error:'signed_tx_hex is required'},400,cors(env,req))
 if(privateKeyPattern.test(JSON.stringify(body))) return json({error:'Wallet secrets are forbidden'},400,cors(env,req))
 const hex=body.signed_tx_hex.trim()
 if(!/^[0-9a-fA-F]{100,400000}$/.test(hex)||hex.length%2) return json({error:'Signed transaction hex is invalid'},400,cors(env,req))
 // Counterparty API deployments can expose different Bitcoin broadcast routes. Keep the path configurable and fail closed if not configured.
 const path=String(env.COUNTERPARTY_BROADCAST_PATH||'').trim()
 if(!path) return json({error:'Broadcast route is not configured on the production gateway.'},503,cors(env,req))
 const r=await fetch(`${upstream(env)}${path}`,{method:'POST',headers:{'content-type':'application/json',accept:'application/json','user-agent':'NEOpay-Gateway/1.0'},body:JSON.stringify({signed_tx_hex:hex})})
 const text=await r.text()
 return new Response(text,{status:r.status,headers:{'content-type':r.headers.get('content-type')||'application/json','cache-control':'no-store',...cors(env,req)}})
}

export default {async fetch(req,env){
 const url=new URL(req.url)
 const headers=cors(env,req)
 if(req.method==='OPTIONS') return new Response(null,{status:204,headers})
 if(url.pathname==='/health') return json({status:'online',service:'neopay-api',custody:'non-custodial'},200,headers)
 try{
   if(req.method==='GET'&&url.pathname.startsWith('/v2/')) return proxyRead(req,env,url.pathname.slice(3)+url.search)
   if(req.method==='POST'&&url.pathname==='/v2/compose/order') return composeOrder(req,env)
   if(req.method==='POST'&&url.pathname==='/v2/broadcast') return broadcastSigned(req,env)
   return json({error:'Not found'},404,headers)
 }catch(error){return json({error:'NEOpay gateway unavailable',detail:String(error?.message||error)},502,headers)}
}}
