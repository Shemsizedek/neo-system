import crypto from 'node:crypto'

export const COMMERCE_MODE = process.env.NEO_MINER_COMMERCE_MODE || 'SIMULATION'

export function id(prefix='id') {
  return `${prefix}_${crypto.randomUUID()}`
}

export function assertLiveSafe(mode=COMMERCE_MODE) {
  if (!['SIMULATION','LIVE_DISABLED','LIVE'].includes(mode)) throw new Error('INVALID_COMMERCE_MODE')
}

export function createAuthoritativeQuote({sku, productType, quantity=1, hashrateTh=0, termMonths=0, baseAmountUsd, paymentCurrency, fxRate, fxSource, ttlSeconds=900, simulation=true}) {
  if (!sku || !productType || !paymentCurrency) throw new Error('QUOTE_INPUT_INVALID')
  if (!(baseAmountUsd >= 0) || !(fxRate > 0)) throw new Error('QUOTE_RATE_INVALID')
  const createdAt = new Date()
  const expiresAt = new Date(createdAt.getTime() + ttlSeconds*1000)
  return {
    quoteId:id('quote'), sku, productType, quantity, hashrateTh, termMonths,
    baseCurrency:'USD', paymentCurrency, baseAmountUsd,
    fxRate, fxSource, paymentAmount:Number((baseAmountUsd*fxRate).toFixed(8)),
    createdAt:createdAt.toISOString(), expiresAt:expiresAt.toISOString(),
    status:'ACTIVE', simulation:Boolean(simulation)
  }
}

export function quoteIsValid(quote, now=new Date()) {
  return quote?.status === 'ACTIVE' && new Date(quote.expiresAt).getTime() > now.getTime()
}

export function createResourceLock({orderId, productType, sku, quantity=1, hashrateTh=0, ttlSeconds=900, simulation=true}) {
  const createdAt = new Date()
  return {
    lockId:id('lock'), orderId, productType, sku, quantity, hashrateTh,
    createdAt:createdAt.toISOString(), expiresAt:new Date(createdAt.getTime()+ttlSeconds*1000).toISOString(),
    status:'ACTIVE', simulation:Boolean(simulation)
  }
}

export function lockIsValid(lock, now=new Date()) {
  return lock?.status === 'ACTIVE' && new Date(lock.expiresAt).getTime() > now.getTime()
}

export function createCheckoutSession({customerId, quote, lock, provider='REFERENCE', compliance='PENDING'}) {
  if (!quoteIsValid(quote)) throw new Error('QUOTE_EXPIRED')
  if (!lockIsValid(lock)) throw new Error('RESOURCE_LOCK_EXPIRED')
  return {
    checkoutId:id('checkout'), customerId, quoteId:quote.quoteId, lockId:lock.lockId,
    provider, paymentCurrency:quote.paymentCurrency, amount:quote.paymentAmount,
    compliance, paymentStatus:'PENDING', status:'OPEN',
    idempotencyKey:id('idem'), simulation:quote.simulation || lock.simulation,
    createdAt:new Date().toISOString()
  }
}

const transitions = {
  PENDING:new Set(['AUTHORIZED','CONFIRMED','FAILED','CANCELLED']),
  AUTHORIZED:new Set(['CONFIRMED','FAILED','CANCELLED']),
  CONFIRMED:new Set(['REFUND_PENDING']),
  REFUND_PENDING:new Set(['REFUNDED','CONFIRMED']),
  FAILED:new Set(), CANCELLED:new Set(), REFUNDED:new Set()
}

export function applyPaymentEvent(checkout, event, processedEventIds=new Set()) {
  if (!checkout || !event?.eventId) throw new Error('PAYMENT_EVENT_INVALID')
  if (processedEventIds.has(event.eventId)) return {checkout, duplicate:true}
  const allowed = transitions[checkout.paymentStatus] || new Set()
  if (!allowed.has(event.paymentStatus)) throw new Error(`INVALID_PAYMENT_TRANSITION:${checkout.paymentStatus}->${event.paymentStatus}`)
  processedEventIds.add(event.eventId)
  return {
    checkout:{...checkout,paymentStatus:event.paymentStatus,status:event.paymentStatus==='CONFIRMED'?'PAID':checkout.status,providerReference:event.providerReference||null,updatedAt:new Date().toISOString()},
    duplicate:false
  }
}

export function canActivateDigital({checkout, quote, lock, compliance, contractExecuted, physicalBackingVerified, mode=COMMERCE_MODE}) {
  assertLiveSafe(mode)
  const reasons=[]
  if (checkout?.paymentStatus !== 'CONFIRMED') reasons.push('PAYMENT_NOT_CONFIRMED')
  if (!quoteIsValid(quote)) reasons.push('QUOTE_INVALID')
  if (!lockIsValid(lock)) reasons.push('CAPACITY_LOCK_INVALID')
  if (compliance !== 'CLEARED') reasons.push('COMPLIANCE_NOT_CLEARED')
  if (!contractExecuted) reasons.push('CONTRACT_NOT_EXECUTED')
  if (!physicalBackingVerified) reasons.push('HASHPOWER_NOT_BACKED')
  if (mode !== 'LIVE') reasons.push('LIVE_MODE_NOT_ENABLED')
  if (checkout?.simulation || quote?.simulation || lock?.simulation) reasons.push('SIMULATION_RECORD')
  return {eligible:reasons.length===0,reasons}
}

export function createReceipt({orderId, checkout, quote, taxAmount=0, shippingAmount=0}) {
  if (checkout.paymentStatus !== 'CONFIRMED') throw new Error('PAYMENT_NOT_CONFIRMED')
  return {
    receiptId:id('receipt'), orderId, checkoutId:checkout.checkoutId, quoteId:quote.quoteId,
    currency:quote.paymentCurrency, subtotal:quote.paymentAmount,
    taxAmount, shippingAmount,
    total:Number((quote.paymentAmount+taxAmount+shippingAmount).toFixed(8)),
    providerReference:checkout.providerReference||null,
    issuedAt:new Date().toISOString(), simulation:Boolean(checkout.simulation||quote.simulation)
  }
}

export function createRefundRequest({orderId, checkout, amount, reason}) {
  if (checkout.paymentStatus !== 'CONFIRMED') throw new Error('REFUND_REQUIRES_CONFIRMED_PAYMENT')
  if (!(amount > 0) || amount > checkout.amount) throw new Error('REFUND_AMOUNT_INVALID')
  return {refundId:id('refund'),orderId,checkoutId:checkout.checkoutId,amount,currency:checkout.paymentCurrency,reason,status:'REQUESTED',idempotencyKey:id('refund-idem'),createdAt:new Date().toISOString(),simulation:Boolean(checkout.simulation)}
}
