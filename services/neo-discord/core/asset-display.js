export const NEO_CURRENCY_SYMBOL='∞'
export const BITCOIN_SYMBOL='₿'

const DEFAULT_TOKENIZED_CURRENCIES=new Set(['XCP','NOMNI'])

function configuredTokenizedCurrencies(env){
  const set=new Set(DEFAULT_TOKENIZED_CURRENCIES)
  for(const value of String(env?.NEO_TOKENIZED_CURRENCIES||'').split(',')){
    const asset=value.trim().toUpperCase()
    if(asset)set.add(asset)
  }
  return set
}

export function assetSymbol(asset,{env,category}={}){
  const name=String(asset||'').trim().toUpperCase()
  if(category==='orange-chip-stock')return ''
  if(name==='BTC')return BITCOIN_SYMBOL
  if(configuredTokenizedCurrencies(env).has(name))return NEO_CURRENCY_SYMBOL
  return ''
}

export function formatAssetAmount(asset,amount,options={}){
  const symbol=assetSymbol(asset,options)
  const value=String(amount??'unknown')
  return symbol?`${symbol}${value}`:value
}

export function isTokenizedCurrency(asset,env){
  return configuredTokenizedCurrencies(env).has(String(asset||'').trim().toUpperCase())
}
