import {CounterpartyV2MarketAdapter} from '../explorer/counterpartyAdapter'
import {TokenScanMarketAdapter} from '../explorer/tokenScanAdapter'
import type {CounterpartyIssuance} from '../explorer/counterpartyAdapter'

export const NEO_TREASURY_WALLET='18FyntJG9hdXYvanm67mGgbyo1P7adckvg'
export const WORLD_CURRENCY_REFERENCE='https://worldcurrency.finance.blog/'

export type TreasuryClass='DIGITAL_COINAGE'|'DIGITAL_FIAT_CASH'|'WORLD_CURRENCY'|'TREASURY_ASSET'
export type OrangeChipInstrumentClass='SHARE'|'NOTE'|'BILL'|'BOND'|'ORDER'|'CREDIT'|'TRUST'|'WARRANT'|'RIGHT'|'ROYALTY'|'EQUITY'|'OTHER'

export type NeoFxTreasuryAsset={
  asset:string
  description:string
  quantity?:number|string
  divisible?:boolean
  locked?:boolean
  txHash?:string
  blockIndex?:number
  source:string
  classification:TreasuryClass
  settlementRole:'CHANGE'|'CASH'|'DENOMINATION'|'TREASURY'
}

const words=(value:string)=>value.toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim()

export function classifyTreasuryAsset(asset:string,description=''):Pick<NeoFxTreasuryAsset,'classification'|'settlementRole'>{
  const text=`${words(asset)} ${words(description)}`
  if(/(^| )COIN(S)?( |$)/.test(text))return {classification:'DIGITAL_COINAGE',settlementRole:'CHANGE'}
  if(/(^| )CASH( |$)/.test(text))return {classification:'DIGITAL_FIAT_CASH',settlementRole:'CASH'}
  if(/CURRENCY|DOLLAR|EURO|STERLING|POUND|YEN|YUAN|RENMINBI|RUPEE|DIRHAM|DINAR|FRANC|PESO|REAL|RAND|KRONA|KRONE|LIRA|WON/.test(text))return {classification:'WORLD_CURRENCY',settlementRole:'DENOMINATION'}
  return {classification:'TREASURY_ASSET',settlementRole:'TREASURY'}
}

export function classifyOrangeChipInstrument(asset:string,description=''):OrangeChipInstrumentClass{
  const text=`${words(asset)} ${words(description)}`
  const tests:[OrangeChipInstrumentClass,RegExp][]=[
    ['SHARE',/(^| )SHARES?( |$)/],['NOTE',/(^| )NOTES?( |$)/],['BILL',/(^| )BILLS?( |$)/],['BOND',/(^| )BONDS?( |$)/],['ORDER',/(^| )ORDERS?( |$)/],['CREDIT',/(^| )CREDITS?( |$)/],['TRUST',/(^| )TRUST(S)?( |$)/],['WARRANT',/(^| )WARRANT(S)?( |$)/],['RIGHT',/(^| )RIGHTS?( |$)/],['ROYALTY',/(^| )ROYALT(Y|IES)( |$)/],['EQUITY',/(^| )EQUITY( |$)/],
  ]
  return tests.find(([,pattern])=>pattern.test(text))?.[0]??'OTHER'
}

function normalize(issuance:CounterpartyIssuance):NeoFxTreasuryAsset|null{
  if(!issuance.asset)return null
  const source=(issuance.source??issuance.issuer??'').trim()
  if(source!==NEO_TREASURY_WALLET)return null
  const status=(issuance.status??'valid').toLowerCase()
  if(status&&status!=='valid')return null
  const description=issuance.description??''
  return {
    asset:issuance.asset,
    description,
    quantity:issuance.quantity_normalized??issuance.quantity,
    divisible:issuance.divisible,
    locked:issuance.locked,
    txHash:issuance.tx_hash,
    blockIndex:issuance.block_index,
    source,
    ...classifyTreasuryAsset(issuance.asset,description),
  }
}

export async function loadNeoFxTreasuryRegistry(){
  const counterparty=new CounterpartyV2MarketAdapter()
  const tokenScan=new TokenScanMarketAdapter()
  const [cp,ts]=await Promise.allSettled([
    counterparty.getAddressIssuances(NEO_TREASURY_WALLET),
    tokenScan.getIssuances(NEO_TREASURY_WALLET),
  ])
  const issuances=[...(cp.status==='fulfilled'?cp.value:[]),...(ts.status==='fulfilled'?ts.value:[])]
  const map=new Map<string,NeoFxTreasuryAsset>()
  for(const issuance of issuances){
    const normalized=normalize(issuance)
    if(!normalized)continue
    const previous=map.get(normalized.asset)
    if(!previous||(normalized.blockIndex??0)>(previous.blockIndex??0))map.set(normalized.asset,normalized)
  }
  return {
    wallet:NEO_TREASURY_WALLET,
    assets:[...map.values()].sort((a,b)=>a.asset.localeCompare(b.asset)),
    sources:{counterparty:cp.status==='fulfilled',tokenScan:ts.status==='fulfilled'},
    observedAt:new Date().toISOString(),
  }
}

export const neoBrandRouting={
  tokenScan:'NEOscan',xcpDex:'NEO DEX',xchain:'NEOChain',metatrader:'NEO Trader',coinbase:'Tokenbase',cashapp:'Tokenapp',bloomberg:'NEO Prime',etrade:'EtherTrade',chase:'NEO Bank',airbnb:'NEO Pads',doordash:'NEO Dash',
} as const
