import crypto from 'node:crypto'

export function normalizeCesMoney(value){
  const amount=Number(value)
  if(!Number.isFinite(amount)||amount<=0) throw new Error('INVALID_CES_AMOUNT')
  return Number(amount.toFixed(2))
}

export function createCesPaymentRequest({orderId,accountId,exchangeId,amount,currency='CES',memo}){
  if(!orderId||!accountId||!exchangeId) throw new Error('CES_PAYMENT_FIELDS_REQUIRED')
  const normalized=normalizeCesMoney(amount)
  return {
    id:`cespay_${crypto.randomUUID()}`,
    orderId,
    accountId,
    exchangeId,
    currency,
    amount:normalized,
    memo:memo||`NEO Miner order ${orderId}`,
    status:'PENDING',
    createdAt:new Date().toISOString(),
    simulation:true
  }
}

export function normalizeCesTradeEvent(event){
  if(!event?.tradeId||!event?.exchangeId||!event?.debitAccount||!event?.creditAccount) throw new Error('INVALID_CES_TRADE_EVENT')
  return {
    providerEventId:String(event.tradeId),
    exchangeId:String(event.exchangeId),
    debitAccount:String(event.debitAccount),
    creditAccount:String(event.creditAccount),
    amount:normalizeCesMoney(event.amount),
    currency:String(event.currency||'CES'),
    postedAt:String(event.postedAt||new Date().toISOString()),
    status:String(event.status||'POSTED').toUpperCase(),
    reference:event.reference?String(event.reference):null
  }
}

export function reconcileCesPayment(request,trade){
  if(request.exchangeId!==trade.exchangeId) return {matched:false,reason:'EXCHANGE_MISMATCH'}
  if(request.accountId!==trade.debitAccount) return {matched:false,reason:'DEBIT_ACCOUNT_MISMATCH'}
  if(trade.status!=='POSTED'&&trade.status!=='CONFIRMED') return {matched:false,reason:'TRADE_NOT_POSTED'}
  if(trade.amount<request.amount) return {matched:false,reason:'UNDERPAID'}
  return {matched:true,reason:'MATCHED',settledAmount:request.amount,providerEventId:trade.providerEventId}
}

export function cesLiveReadiness(config={}){
  const checks={
    baseUrl:Boolean(config.baseUrl&&String(config.baseUrl).startsWith('https://')),
    exchangeId:Boolean(config.exchangeId),
    accountId:Boolean(config.accountId),
    credentialRef:Boolean(config.credentialRef),
    enabled:config.enabled===true
  }
  return {ready:Object.values(checks).every(Boolean),checks}
}
