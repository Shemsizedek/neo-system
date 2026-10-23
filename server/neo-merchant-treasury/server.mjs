import http from 'node:http'
import {createMerchantLedger,creditFinalPayment,holdReserve,releaseReserve,createSettlementBatch,reconcileBatch,createPayout,approvePayout,recordPayoutEvidence,createRefund,createDispute,treasurySnapshot} from './fabric.mjs'
const PORT=Number(process.env.PORT||8812),TOKEN=String(process.env.NEO_MERCHANT_TREASURY_OPERATOR_TOKEN||'')
const ledger=createMerchantLedger(),batches=[],payouts=[],refunds=[],disputes=[],reserves=[]
const json=(res,s,b)=>{res.writeHead(s,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(b))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const c=[];for await(const x of req)c.push(x);return c.length?JSON.parse(Buffer.concat(c).toString('utf8')):{}}
export function createTreasuryServer(){return http.createServer(async(req,res)=>{try{
 const u=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{ok:true,service:'neo-merchant-treasury'})
 if(req.method==='GET'&&u.pathname==='/v1/estate/merchant-treasury')return json(res,200,treasurySnapshot({ledger,batches,payouts,refunds,disputes,reserves}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&u.pathname==='/v1/credits'){return json(res,201,creditFinalPayment(ledger,await body(req)))}
 if(req.method==='POST'&&u.pathname==='/v1/reserves'){const x=holdReserve(ledger,await body(req));reserves.push(x.reserve);return json(res,201,x)}
 const rr=u.pathname.match(/^\/v1\/reserves\/([^/]+)\/release$/);if(req.method==='POST'&&rr){const r=reserves.find(x=>x.reserve_id===decodeURIComponent(rr[1]));if(!r)return json(res,404,{error:'reserve_not_found'});const x=releaseReserve(ledger,r);Object.assign(r,x.reserve);return json(res,200,x)}
 if(req.method==='POST'&&u.pathname==='/v1/batches'){const b=createSettlementBatch(await body(req));batches.push(b);return json(res,201,b)}
 const rb=u.pathname.match(/^\/v1\/batches\/([^/]+)\/reconcile$/);if(req.method==='POST'&&rb){const b=batches.find(x=>x.batch_id===decodeURIComponent(rb[1]));if(!b)return json(res,404,{error:'batch_not_found'});const i=await body(req),bal=[...ledger.values()].find(x=>x.merchant_id===b.merchant_id&&x.asset===b.asset);Object.assign(b,reconcileBatch(b,{verifiedPaymentIds:i.verified_payment_ids||[],ledgerBalance:bal}));return json(res,200,b)}
 if(req.method==='POST'&&u.pathname==='/v1/payouts'){const i=await body(req),b=batches.find(x=>x.batch_id===i.batch_id);const p=createPayout({...i,batch:b});payouts.push(p);return json(res,201,p)}
 const ap=u.pathname.match(/^\/v1\/payouts\/([^/]+)\/approve$/);if(req.method==='POST'&&ap){const p=payouts.find(x=>x.payout_id===decodeURIComponent(ap[1]));Object.assign(p,approvePayout(p,{approved:true}));return json(res,200,p)}
 const pe=u.pathname.match(/^\/v1\/payouts\/([^/]+)\/evidence$/);if(req.method==='POST'&&pe){const p=payouts.find(x=>x.payout_id===decodeURIComponent(pe[1]));Object.assign(p,recordPayoutEvidence(p,await body(req)));return json(res,200,p)}
 if(req.method==='POST'&&u.pathname==='/v1/refunds'){const r=createRefund(await body(req));refunds.push(r);return json(res,201,r)}
 if(req.method==='POST'&&u.pathname==='/v1/disputes'){const d=createDispute(await body(req));disputes.push(d);return json(res,201,d)}
 return json(res,404,{error:'not_found'})
}catch(e){return json(res,500,{error:'neo_merchant_treasury_error',detail:String(e?.message||e)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createTreasuryServer().listen(PORT,'0.0.0.0')
