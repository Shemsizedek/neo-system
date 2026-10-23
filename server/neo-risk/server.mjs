import http from 'node:http'
import {normalizePosition,markPosition,calculateParametricVar,runStress,marginUtilization,evaluateLimits,createKillSwitch,applyKillSwitch,riskReview,riskSnapshot,portfolioExposure,concentrationRisk} from './fabric.mjs'
const PORT=Number(process.env.PORT||8816),TOKEN=String(process.env.NEO_RISK_OPERATOR_TOKEN||'')
const positions=[],prices=new Map(),vols=new Map();let killSwitch=null
const json=(res,s,b)=>{res.writeHead(s,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(b))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const c=[];for await(const x of req)c.push(x);return c.length?JSON.parse(Buffer.concat(c).toString('utf8')):{}}
const marked=()=>positions.map(p=>markPosition(p,{price:prices.get(p.asset)}))
export function createRiskServer(){return http.createServer(async(req,res)=>{try{
 const u=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{ok:true,service:'neo-risk',positions:positions.length,kill_switch_active:Boolean(killSwitch?.active)})
 if(req.method==='GET'&&u.pathname==='/v1/estate/risk'){
   const m=marked(),v=calculateParametricVar({marked:m,volatilityByAsset:Object.fromEntries(vols)}),mg=marginUtilization({required_margin:0,eligible_collateral:0}),l=evaluateLimits({exposure:portfolioExposure(m),concentration:concentrationRisk(m),varResult:v,margin:mg,limits:{}})
   return json(res,200,riskSnapshot({marked:m,varResult:v,stress:{},margin:mg,limitsResult:l,killSwitch}))
 }
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&u.pathname==='/v1/positions'){const p=normalizePosition(await body(req));positions.push(p);return json(res,201,p)}
 if(req.method==='POST'&&u.pathname==='/v1/prices'){const i=await body(req);prices.set(String(i.asset).toUpperCase(),Number(i.price));if(i.volatility!=null)vols.set(String(i.asset).toUpperCase(),Number(i.volatility));return json(res,200,{ok:true})}
 if(req.method==='POST'&&u.pathname==='/v1/evaluate'){const i=await body(req),m=marked(),v=calculateParametricVar({marked:m,volatilityByAsset:Object.fromEntries(vols),confidenceZ:i.confidence_z||2.326,horizonDays:i.horizon_days||1}),stress=runStress(m,i.scenarios||{}),mg=marginUtilization({required_margin:i.required_margin||0,eligible_collateral:i.eligible_collateral||0}),limits=evaluateLimits({exposure:portfolioExposure(m),concentration:concentrationRisk(m),varResult:v,margin:mg,limits:i.limits||{},openOrderNotional:i.open_order_notional||0});return json(res,200,{snapshot:riskSnapshot({marked:m,varResult:v,stress,margin:mg,limitsResult:limits,killSwitch}),order_gate:applyKillSwitch(limits,{killSwitch}),risk_review:riskReview({marked:m,margin:mg})})}
 if(req.method==='POST'&&u.pathname==='/v1/kill-switch'){killSwitch=createKillSwitch(await body(req));return json(res,201,killSwitch)}
 if(req.method==='DELETE'&&u.pathname==='/v1/kill-switch'){if(killSwitch)killSwitch={...killSwitch,active:false,deactivated_at:new Date().toISOString()};return json(res,200,killSwitch||{active:false})}
 return json(res,404,{error:'not_found'})
}catch(e){return json(res,500,{error:'neo_risk_error',detail:String(e?.message||e)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createRiskServer().listen(PORT,'0.0.0.0')
