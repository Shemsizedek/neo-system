import {createHash} from 'node:crypto'

const required=(value,label)=>{if(value===undefined||value===null||value==='')throw new Error(`${label} is required`);return value}

export function validateCesCoordinatorConfig(config={}){
  const errors=[]
  if(!config.enabled) errors.push('CES coordinator is disabled')
  if(!String(config.endpoint||'').startsWith('https://')) errors.push('HTTPS endpoint required')
  if(!config.exchangeId) errors.push('exchangeId required')
  if(!config.coordinatorAccountId) errors.push('coordinatorAccountId required')
  if(!config.secretRef) errors.push('secretRef required')
  return {ready:errors.length===0,errors}
}

export function normalizeCesAccount(raw={}){
  return {
    exchangeId:required(raw.exchange_id??raw.exchangeId,'exchangeId'),
    accountId:required(raw.account_id??raw.accountId,'accountId'),
    memberId:raw.member_id??raw.memberId??null,
    displayName:raw.name??raw.displayName??null,
    currency:raw.currency??raw.unit??'CES',
    balance:Number(raw.balance??0),
    creditLimit:Number(raw.credit_limit??raw.creditLimit??0),
    status:String(raw.status??'ACTIVE').toUpperCase(),
    syncedAt:new Date().toISOString()
  }
}

export function normalizeCesTrade(raw={}){
  const externalId=required(raw.trade_id??raw.tradeId??raw.id,'tradeId')
  const exchangeId=required(raw.exchange_id??raw.exchangeId,'exchangeId')
  const amount=Number(required(raw.amount,'amount'))
  if(!Number.isFinite(amount)||amount<=0) throw new Error('amount must be positive')
  const canonical=[exchangeId,externalId,raw.debit_account??raw.debitAccount,raw.credit_account??raw.creditAccount,amount,raw.currency??raw.unit??'CES'].join('|')
  return {
    eventId:`CES-${createHash('sha256').update(canonical).digest('hex').slice(0,24)}`,
    externalId,
    exchangeId,
    debitAccount:required(raw.debit_account??raw.debitAccount,'debitAccount'),
    creditAccount:required(raw.credit_account??raw.creditAccount,'creditAccount'),
    amount,
    currency:raw.currency??raw.unit??'CES',
    memo:raw.memo??null,
    status:String(raw.status??'POSTED').toUpperCase(),
    postedAt:raw.posted_at??raw.postedAt??new Date().toISOString(),
    rawReference:raw.reference??null
  }
}

export function reconcileCesPayment({order,trade,merchantAccountId}){
  const reasons=[]
  if(trade.status!=='POSTED'&&trade.status!=='SETTLED') reasons.push('trade not posted')
  if(order.paymentRail!=='CES') reasons.push('order is not CES rail')
  if(order.exchangeId&&order.exchangeId!==trade.exchangeId) reasons.push('exchange mismatch')
  if(order.customerCesAccount&&order.customerCesAccount!==trade.debitAccount) reasons.push('customer debit account mismatch')
  if(merchantAccountId&&merchantAccountId!==trade.creditAccount) reasons.push('merchant credit account mismatch')
  if(order.currency&&order.currency!==trade.currency) reasons.push('currency mismatch')
  if(Math.abs(Number(order.amount)-Number(trade.amount))>1e-8) reasons.push('amount mismatch')
  return {matched:reasons.length===0,reasons,orderId:order.id,tradeId:trade.externalId,eventId:trade.eventId}
}

export function buildCesSyncCursor({exchangeId,lastTradeId=null,lastPostedAt=null}){
  return {exchangeId,lastTradeId,lastPostedAt,updatedAt:new Date().toISOString()}
}
