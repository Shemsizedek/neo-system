import http from 'node:http'
import {createInstitution,createAccount,createPositionRecord,createCollateralRecord,createFinancingRecord,createBorrowLendInventory,buildCrossMarginView,createInstitutionalStatement,createAccountEvidence,primeAccountSnapshot} from './fabric.mjs'
const PORT=Number(process.env.PORT||8817),TOKEN=String(process.env.NEO_PRIME_ACCOUNTS_OPERATOR_TOKEN||'')
const institutions=[],accounts=[],positions=[],collateral=[],financing=[],inventory=[],evidence=[]
const json=(res,s,b)=>{res.writeHead(s,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(b))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const c=[];for await(const x of req)c.push(x);return c.length?JSON.parse(Buffer.concat(c).toString('utf8')):{}}
function ev(type,account_id,data){const e=createAccountEvidence({event_type:type,account_id,data,previous_digest:evidence.at(-1)?.digest||null});evidence.push(e)}
export function createPrimeAccountsServer(){return http.createServer(async(req,res)=>{try{
 const u=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{ok:true,service:'neo-prime-accounts'})
 if(req.method==='GET'&&u.pathname==='/v1/estate/prime-accounts')return json(res,200,primeAccountSnapshot({institutions,accounts,positions,collateral,financing,inventory,evidence}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&u.pathname==='/v1/institutions'){const i=createInstitution(await body(req));institutions.push(i);return json(res,201,i)}
 if(req.method==='POST'&&u.pathname==='/v1/accounts'){const a=createAccount(await body(req));accounts.push(a);ev('ACCOUNT_CREATED',a.account_id,a);return json(res,201,a)}
 if(req.method==='POST'&&u.pathname==='/v1/positions'){const p=createPositionRecord(await body(req));positions.push(p);ev('POSITION_RECORDED',p.account_id,p);return json(res,201,p)}
 if(req.method==='POST'&&u.pathname==='/v1/collateral'){const c=createCollateralRecord(await body(req));collateral.push(c);ev('COLLATERAL_RECORDED',c.account_id,c);return json(res,201,c)}
 if(req.method==='POST'&&u.pathname==='/v1/financing'){const f=createFinancingRecord(await body(req));financing.push(f);return json(res,201,f)}
 if(req.method==='POST'&&u.pathname==='/v1/borrow-lend-inventory'){const i=createBorrowLendInventory(await body(req));inventory.push(i);return json(res,201,i)}
 if(req.method==='POST'&&u.pathname==='/v1/cross-margin'){const i=await body(req);return json(res,200,buildCrossMarginView({accounts,positions,collateral,riskByPortfolio:i.risk_by_portfolio||{}}))}
 if(req.method==='POST'&&u.pathname==='/v1/statements'){const i=await body(req),institution=institutions.find(x=>x.institution_id===i.institution_id);if(!institution)return json(res,404,{error:'institution_not_found'});return json(res,200,createInstitutionalStatement({institution,accounts:accounts.filter(a=>a.institution_id===institution.institution_id),positions,collateral,financing,inventory}))}
 return json(res,404,{error:'not_found'})
}catch(e){return json(res,500,{error:'neo_prime_accounts_error',detail:String(e?.message||e)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createPrimeAccountsServer().listen(PORT,'0.0.0.0')
