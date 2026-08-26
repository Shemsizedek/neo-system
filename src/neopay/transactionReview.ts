import type{PreflightResult,PreflightSummary}from'./preflight'

export type TransactionReview={
  action:string
  source:string
  destination?:string
  destinationWarning?:string
  asset?:string
  amount?:number
  market?:string
  side?:string
  price?:number
  estimatedNetworkFeeSats:number
  estimatedNetworkFeeBtc:number
  spendableSats:number
  counterpartyProvider:string
  bitcoinReadProvider:string
  bitcoinBroadcastProvider:string
  checkedAt:string
}

const DEFAULT_SAT_PER_VBYTE=3

function estimateVbytes(unsignedTxHex:string){
  const bytes=Math.ceil(unsignedTxHex.length/2)
  return Math.max(140,bytes)
}

export function buildTransactionReview(unsignedTxHex:string,summary:PreflightSummary,preflight:PreflightResult):TransactionReview{
  const estimatedNetworkFeeSats=Math.max(preflight.feeReserveSats,Math.ceil(estimateVbytes(unsignedTxHex)*DEFAULT_SAT_PER_VBYTE))
  return{
    action:String(summary.action||'transaction'),
    source:preflight.source,
    destination:typeof summary.destination==='string'?summary.destination:undefined,
    destinationWarning:preflight.destinationWarning,
    asset:typeof summary.asset==='string'?summary.asset:undefined,
    amount:Number.isFinite(Number(summary.amount))?Number(summary.amount):undefined,
    market:typeof summary.market==='string'?summary.market:undefined,
    side:typeof summary.side==='string'?summary.side:undefined,
    price:Number.isFinite(Number(summary.price))?Number(summary.price):undefined,
    estimatedNetworkFeeSats,
    estimatedNetworkFeeBtc:estimatedNetworkFeeSats/100_000_000,
    spendableSats:preflight.spendableSats,
    counterpartyProvider:preflight.counterpartyProvider,
    bitcoinReadProvider:preflight.bitcoinReadProvider,
    bitcoinBroadcastProvider:preflight.bitcoinBroadcastProvider,
    checkedAt:preflight.checkedAt
  }
}

function formatAmount(review:TransactionReview){
  if(review.action==='send')return`${review.amount?.toLocaleString()??'—'} ${review.asset||''}`.trim()
  if(review.action==='order')return`${review.side||''} ${review.amount?.toLocaleString()??'—'} NOMNI @ ${review.price?.toLocaleString(undefined,{maximumFractionDigits:8})??'—'} XCP`.trim()
  return review.amount?.toLocaleString()||'—'
}

export function requestTransactionApproval(review:TransactionReview){
  const lines=[
    'NEOpay — Final Transaction Review',
    '',
    `Action: ${review.action.toUpperCase()}`,
    `Amount / Order: ${formatAmount(review)}`,
    review.destination?`Destination: ${review.destination}`:'',
    review.destinationWarning?'':null,
    review.destinationWarning?`⚠ SECURITY WARNING: ${review.destinationWarning}`:'',
    review.market?`Market: ${review.market}`:'',
    `Source: ${review.source}`,
    '',
    `Estimated Bitcoin fee: ${review.estimatedNetworkFeeSats.toLocaleString()} sats (${review.estimatedNetworkFeeBtc.toFixed(8)} BTC)`,
    `Spendable BTC reserve: ${review.spendableSats.toLocaleString()} sats`,
    '',
    `Counterparty: ${review.counterpartyProvider}`,
    `Bitcoin read: ${review.bitcoinReadProvider}`,
    `Bitcoin broadcast: ${review.bitcoinBroadcastProvider}`,
    '',
    'This fee is an estimate; the connected wallet may calculate a different final network fee.',
    'Approve this transaction and continue to your wallet signer?'
  ].filter(Boolean)
  return window.confirm(lines.join('\n'))
}
