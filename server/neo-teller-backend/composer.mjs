import crypto from 'node:crypto'

const FORBIDDEN_KEYS=new Set(['privateKey','private_key','wif','seed','mnemonic','secret','password','xprv'])
const ADDRESS_RE=/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{20,100}$/
const ASSET_RE=/^[A-Z][A-Z0-9._-]{0,63}$/

export function assertNoSecrets(value,path='request'){
  if(!value||typeof value!=='object') return
  for(const [key,v] of Object.entries(value)){
    if(FORBIDDEN_KEYS.has(key)) throw new Error(`FORBIDDEN_SECRET_FIELD:${path}.${key}`)
    assertNoSecrets(v,`${path}.${key}`)
  }
}

export function validateSendIntent(input={}){
  assertNoSecrets(input)
  const source=String(input.source||'').trim()
  const destination=String(input.destination||'').trim()
  const asset=String(input.asset||'').trim().toUpperCase()
  const quantity=Number(input.quantity)
  if(!ADDRESS_RE.test(source)) throw new Error('INVALID_SOURCE_ADDRESS')
  if(!ADDRESS_RE.test(destination)) throw new Error('INVALID_DESTINATION_ADDRESS')
  if(!ASSET_RE.test(asset)) throw new Error('INVALID_ASSET')
  if(!Number.isFinite(quantity)||quantity<=0) throw new Error('INVALID_QUANTITY')
  return {source,destination,asset,quantity,memo:input.memo?String(input.memo).slice(0,1024):undefined}
}

export function buildComposeUrl(base,input){
  const v=validateSendIntent(input)
  const url=new URL(`${base.replace(/\/$/,'')}/v2/addresses/${encodeURIComponent(v.source)}/compose/send`)
  url.searchParams.set('destination',v.destination)
  url.searchParams.set('asset',v.asset)
  url.searchParams.set('quantity',String(v.quantity))
  if(v.memo) url.searchParams.set('memo',v.memo)
  return {url:url.toString(),intent:v}
}

export function normalizeComposition(payload,intent){
  const result=payload?.result??payload
  const unsigned=result?.rawtransaction??result?.unsigned_tx??result?.unsigned_transaction??result?.tx_hex??null
  if(!unsigned||typeof unsigned!=='string') throw new Error('COMPOSER_RETURNED_NO_UNSIGNED_TRANSACTION')
  const intentId=crypto.createHash('sha256').update(JSON.stringify(intent)).digest('hex').slice(0,24)
  return {
    intentId,
    intent,
    unsignedTransaction:unsigned,
    signing:{mode:'USER_CONTROLLED',backendHasPrivateKey:false,backendCanSign:false},
    broadcast:{enabled:false,status:'NOT_SUBMITTED'},
    composerMetadata:{btcFee:result?.btc_fee??result?.fee,txSize:result?.tx_size,data:result?.data}
  }
}
