import http from 'node:http'
import {createProduct,createPricingPolicy,priceOffer,calculateEffectiveCost,createOfferVersion,createPricingOverride,pricingSnapshot} from './fabric.mjs'
const PORT=Number(process.env.PORT||8827),TOKEN=String(process.env.NEO_CREDIT_PRICING_OPERATOR_TOKEN||'')
const products=[],policies=[],offers=[],overrides=[]
const json=(res,s,b)=>{res.writeHead(s,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(b))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const c=[];for await(const x of req)c.push(x);return c.length?JSON.parse(Buffer.concat(c).toString('utf8')):{}}
export function createCreditPricingServer(){return http.createServer(async(req,res)=>{try{
 const u=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{ok:true,service:'neo-credit-pricing'})
 if(req.method==='GET'&&u.pathname==='/v1/estate/credit-pricing')return json(res,200,pricingSnapshot({products,policies,offers,overrides}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&u.pathname==='/v1/products'){const p=createProduct(await body(req));products.push(p);return json(res,201,p)}
 if(req.method==='POST'&&u.pathname==='/v1/policies'){const p=createPricingPolicy(await body(req));policies.push(p);return json(res,201,p)}
 if(req.method==='POST'&&u.pathname==='/v1/price'){const i=await body(req),product=products.find(x=>x.product_id===i.product_id&&x.version===i.product_version),policy=policies.find(x=>x.policy_id===i.policy_id);if(!product||!policy)return json(res,404,{error:'product_or_policy_not_found'});const pricing=priceOffer({product,policy,application:i.application,score:i.score});const cost=pricing.eligible?calculateEffectiveCost({principal:pricing.amount,rate_bps:pricing.rate_bps,term_months:pricing.term_months,fees:pricing.total_fees}):null;return json(res,200,{pricing,cost})}
 if(req.method==='POST'&&u.pathname==='/v1/offers'){const o=createOfferVersion(await body(req));offers.push(o);return json(res,201,o)}
 if(req.method==='POST'&&u.pathname==='/v1/overrides'){const o=createPricingOverride(await body(req));overrides.push(o);return json(res,201,o)}
 return json(res,404,{error:'not_found'})
}catch(e){return json(res,500,{error:'neo_credit_pricing_error',detail:String(e?.message||e)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createCreditPricingServer().listen(PORT,'0.0.0.0')
