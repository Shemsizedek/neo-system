import crypto from 'node:crypto'
const now=()=>new Date().toISOString(), clone=v=>structuredClone(v), sha=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')

export function createInstitution(input={}){
  if(!input.institution_id||!input.name)throw new TypeError('institution_id and name required')
  return {institution_id:String(input.institution_id),name:String(input.name),classification:input.classification||'COMMUNITY_INSTITUTION',status:'ACTIVE',created_at:now()}
}
export function createAccount(input={}){
  if(!input.account_id||!input.institution_id||!input.account_type)throw new TypeError('account_id, institution_id and account_type required')
  return {account_id:String(input.account_id),institution_id:String(input.institution_id),parent_account_id:input.parent_account_id||null,account_type:String(input.account_type),custody_mode:input.custody_mode||'SELF_CUSTODY',asset_scope:[...new Set(input.asset_scope||[])],portfolio_id:input.portfolio_id||null,wallet_or_custody_ref:input.wallet_or_custody_ref||null,status:'ACTIVE',private_keys_stored:false,created_at:now()}
}
export function validateSegregation(accounts=[]){
  const errors=[]; for(const a of accounts){if(a.parent_account_id===a.account_id)errors.push({account_id:a.account_id,reason:'self_parent'});if(a.account_type==='COLLATERAL'&&!a.parent_account_id)errors.push({account_id:a.account_id,reason:'collateral_requires_parent'})}
  return {valid:errors.length===0,errors}
}
export function createPositionRecord(input={}){
  if(!input.account_id||!input.asset)throw new TypeError('account_id and asset required')
  return {position_id:input.position_id||`POS-${crypto.randomUUID()}`,account_id:String(input.account_id),asset:String(input.asset).toUpperCase(),quantity:Number(input.quantity||0),market_value:input.market_value==null?null:Number(input.market_value),evidence_refs:clone(input.evidence_refs||[]),updated_at:now()}
}
export function createCollateralRecord(input={}){
  if(!input.collateral_id||!input.account_id||!input.asset)throw new TypeError('collateral fields required')
  return {collateral_id:String(input.collateral_id),account_id:String(input.account_id),asset:String(input.asset).toUpperCase(),quantity:Number(input.quantity||0),market_value:input.market_value==null?null:Number(input.market_value),haircut_bps:Number(input.haircut_bps||0),status:'POSTED',evidence_refs:clone(input.evidence_refs||[]),updated_at:now()}
}
export function eligibleCollateralValue(records=[]){return records.reduce((n,r)=>n+Math.max(0,Number(r.market_value||0))*(1-Math.min(10000,Math.max(0,Number(r.haircut_bps||0)))/10000),0)}
export function createFinancingRecord(input={}){
  if(!input.financing_id||!input.account_id||!input.asset)throw new TypeError('financing fields required')
  return {financing_id:String(input.financing_id),account_id:String(input.account_id),asset:String(input.asset).toUpperCase(),principal:Number(input.principal||0),rate_bps:Number(input.rate_bps||0),term_days:Number(input.term_days||0),counterparty_id:input.counterparty_id||null,status:'RECORDED_NOT_EXECUTED',execution_adapter:null,created_at:now()}
}
export function createBorrowLendInventory(input={}){
  if(!input.inventory_id||!input.account_id||!input.asset)throw new TypeError('inventory fields required')
  return {inventory_id:String(input.inventory_id),account_id:String(input.account_id),asset:String(input.asset).toUpperCase(),available_to_borrow:Number(input.available_to_borrow||0),borrowed:Number(input.borrowed||0),lent:Number(input.lent||0),utilization:Number(input.available_to_borrow)>0?Number(input.borrowed||0)/Number(input.available_to_borrow):0,status:'VIEW_ONLY',updated_at:now()}
}
export function buildCrossMarginView({accounts=[],positions=[],collateral=[],riskByPortfolio={}}={}){
  const rows=accounts.filter(a=>['PORTFOLIO','SUBACCOUNT'].includes(a.account_type)).map(a=>{const ps=positions.filter(p=>p.account_id===a.account_id),cs=collateral.filter(c=>c.account_id===a.account_id);return {account_id:a.account_id,portfolio_id:a.portfolio_id,gross_exposure:ps.reduce((n,p)=>n+Math.abs(Number(p.market_value||0)),0),eligible_collateral:eligibleCollateralValue(cs),risk:a.portfolio_id?(riskByPortfolio[a.portfolio_id]||null):null}})
  return {rows,total_gross_exposure:rows.reduce((n,r)=>n+r.gross_exposure,0),total_eligible_collateral:rows.reduce((n,r)=>n+r.eligible_collateral,0),view_only:true}
}
export function createInstitutionalStatement({institution,accounts=[],positions=[],collateral=[],financing=[],inventory=[]}={}){
  if(!institution)throw new TypeError('institution required')
  const s={statement_id:`STM-${crypto.randomUUID()}`,institution_id:institution.institution_id,generated_at:now(),accounts:accounts.map(a=>({account_id:a.account_id,type:a.account_type,custody_mode:a.custody_mode,status:a.status})),positions:clone(positions),collateral:clone(collateral),financing:clone(financing),borrow_lend_inventory:clone(inventory),private_keys_included:false}
  return {...s,digest:sha(s)}
}
export function createAccountEvidence({event_type,account_id,data={},previous_digest=null}={}){
  const e={evidence_id:`ACE-${crypto.randomUUID()}`,event_type:String(event_type),account_id:String(account_id),data:clone(data),previous_digest,recorded_at:now()};return {...e,digest:sha(e)}
}
export function primeAccountSnapshot({institutions=[],accounts=[],positions=[],collateral=[],financing=[],inventory=[],evidence=[]}={}){
  return {estate:'Global Vast Estate',fabric:'NEO Institutional Account Fabric',institutions:{total:institutions.length,active:institutions.filter(x=>x.status==='ACTIVE').length},accounts:{total:accounts.length,self_custody:accounts.filter(x=>x.custody_mode==='SELF_CUSTODY').length,external_custody:accounts.filter(x=>x.custody_mode==='EXTERNAL_CUSTODIAN').length},positions:positions.length,collateral:{records:collateral.length,eligible_value:eligibleCollateralValue(collateral)},financing:{records:financing.length,executed:financing.filter(x=>x.status==='EXECUTED').length},borrow_lend:{records:inventory.length,view_only:true},evidence:{events:evidence.length},private_keys_stored:false,authority_boundary:'Internal institutional account coordination does not establish external prime-broker, broker-dealer, bank-custody, or securities-lending status.',generated_at:now()}
}
