export function normalizeBitcoinPayment(event){
  if(!event?.txid||!event?.amountBtc) throw new Error('INVALID_BTC_EVENT')
  return {
    rail:'BTC_ONCHAIN',
    providerEventId:String(event.txid),
    amountBtc:Number(event.amountBtc),
    confirmations:Number(event.confirmations||0),
    address:event.address?String(event.address):null,
    status:Number(event.confirmations||0)>0?'CONFIRMED':'PENDING'
  }
}

export function normalizeLightningPayment(event){
  if(!event?.paymentHash||!event?.amountSats) throw new Error('INVALID_LIGHTNING_EVENT')
  return {
    rail:'BTC_LIGHTNING',
    providerEventId:String(event.paymentHash),
    amountSats:Number(event.amountSats),
    settled:Boolean(event.settled),
    status:event.settled?'CONFIRMED':'PENDING'
  }
}

export function normalizeCounterpartyPayment(event){
  if(!event?.txHash||!event?.asset||event?.quantity==null) throw new Error('INVALID_COUNTERPARTY_EVENT')
  return {
    rail:'COUNTERPARTY',
    providerEventId:String(event.txHash),
    asset:String(event.asset).toUpperCase(),
    quantity:Number(event.quantity),
    source:event.source?String(event.source):null,
    destination:event.destination?String(event.destination):null,
    blockIndex:event.blockIndex==null?null:Number(event.blockIndex),
    confirmed:event.confirmed===true,
    status:event.confirmed===true?'CONFIRMED':'PENDING'
  }
}

export function blockchainRailReadiness(config={}){
  return {
    ready:Boolean(config.enabled&&config.endpoint&&String(config.endpoint).startsWith('https://')&&config.credentialRef),
    enabled:config.enabled===true
  }
}
