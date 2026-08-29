import { formatAssetAmount } from './asset-display.js'

const COUNTERPARTY_API='https://api.counterparty.io:4000/v2'
const MEMPOOL_API='https://mempool.space/api'

function splitConfiguredWallets(value){
  return String(value||'').split(/[\n;,]+/).map(x=>x.trim()).filter(Boolean)
}

export function configuredWallets(env={}){
  const wallets=[]
  for(const entry of splitConfiguredWallets(env.NEO_WALLET_ADDRESSES)){
    const separator=entry.includes('=')?'=':entry.includes('|')?'|':null
    if(!separator)continue
    const [rawLabel,...rest]=entry.split(separator)
    const label=String(rawLabel||'').trim()
    const address=rest.join(separator).trim()
    if(label&&address)wallets.push({label,address})
  }
  return wallets
}

function satsToBtc(value){
  try{
    const n=BigInt(String(value??0))
    const neg=n<0n
    const abs=neg?-n:n
    const whole=abs/100000000n
    const frac=String(abs%100000000n).padStart(8,'0').replace(/0+$/,'')
    return `${neg?'-':''}${whole}${frac?'.'+frac:''}`
  }catch{return 'unknown'}
}

function normalizeCounterpartyQuantity(value,divisible){
  if(value===null||value===undefined)return 'unknown'
  const raw=String(value)
  if(!divisible||!/^-?\d+$/.test(raw))return raw
  try{
    const n=BigInt(raw)
    const neg=n<0n
    const abs=neg?-n:n
    const whole=abs/100000000n
    const frac=String(abs%100000000n).padStart(8,'0').replace(/0+$/,'')
    return `${neg?'-':''}${whole}${frac?'.'+frac:''}`
  }catch{return raw}
}

async function getJson(url,label){
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'neo-discord-api'},signal:AbortSignal.timeout(15000)})
  const body=await r.json().catch(()=>({}))
  if(!r.ok)throw new Error(`${label} ${r.status}: ${body?.error||body?.message||'request failed'}`)
  if(body?.error)throw new Error(`${label}: ${body.error}`)
  return body
}

async function bitcoinAddressStatus(address){
  const body=await getJson(`${MEMPOOL_API}/address/${encodeURIComponent(address)}`,'mempool.space')
  const chain=body?.chain_stats||{}
  const mempool=body?.mempool_stats||{}
  const confirmed=BigInt(String(chain.funded_txo_sum??0))-BigInt(String(chain.spent_txo_sum??0))
  const pending=BigInt(String(mempool.funded_txo_sum??0))-BigInt(String(mempool.spent_txo_sum??0))
  return {
    confirmed:satsToBtc(confirmed),
    pending:satsToBtc(pending),
    total:satsToBtc(confirmed+pending),
    confirmedTxs:Number(chain.tx_count??0),
    mempoolTxs:Number(mempool.tx_count??0)
  }
}

async function counterpartyGet(path){
  const body=await getJson(`${COUNTERPARTY_API}${path}`,'Counterparty')
  return body?.result
}

async function counterpartyBalances(address,env){
  const rows=await counterpartyGet(`/addresses/${encodeURIComponent(address)}/balances`)
  const balances=Array.isArray(rows)?rows:[]
  const nonzero=balances.filter(row=>String(row?.quantity??'0')!=='0').slice(0,50)
  const uniqueAssets=[...new Set(nonzero.map(row=>String(row?.asset||'').trim()).filter(Boolean))]
  const metadataEntries=await Promise.all(uniqueAssets.map(async asset=>{
    try{return [asset,await counterpartyGet(`/assets/${encodeURIComponent(asset)}`)]}
    catch{return [asset,null]}
  }))
  const metadata=new Map(metadataEntries)
  return nonzero.map(row=>{
    const asset=String(row?.asset||'UNKNOWN')
    const info=metadata.get(asset)||{}
    const divisible=info?.divisible===true
    const normalized=row?.quantity_normalized??row?.normalized_quantity??normalizeCounterpartyQuantity(row?.quantity,divisible)
    return {asset,amount:formatAssetAmount(asset,normalized,{env}),divisible}
  })
}

function holdingPriority(asset){
  if(asset==='XCP')return 0
  if(asset==='NOMNI')return 1
  return 2
}

async function walletStatus(wallet,env){
  const [btc,assets]=await Promise.all([
    bitcoinAddressStatus(wallet.address),
    counterpartyBalances(wallet.address,env)
  ])
  const holdings=[...assets].sort((a,b)=>holdingPriority(a.asset)-holdingPriority(b.asset)||a.asset.localeCompare(b.asset))
  return {wallet,btc,holdings}
}

export async function treasuryStatus(env={}){
  const wallets=configuredWallets(env)
  if(!wallets.length){
    return [
      '**NEO Treasury Live Status**',
      'No public wallet addresses are configured.',
      'Configure the runtime variable `NEO_WALLET_ADDRESSES` as `Label=bitcoinAddress` entries separated by commas, semicolons, or new lines.',
      '',
      'Read-only mode: no private keys, signing, transaction composition, or broadcasting are used.'
    ].join('\n')
  }
  const results=await Promise.all(wallets.map(wallet=>walletStatus(wallet,env)))
  const lines=['**NEO Treasury Live Status**']
  for(const item of results){
    lines.push('',`**${item.wallet.label}**`,item.wallet.address)
    lines.push(`BTC confirmed: ${formatAssetAmount('BTC',item.btc.confirmed,{env})}`)
    lines.push(`BTC pending: ${formatAssetAmount('BTC',item.btc.pending,{env})}`)
    lines.push(`BTC total: ${formatAssetAmount('BTC',item.btc.total,{env})}`)
    lines.push('Counterparty holdings:')
    if(!item.holdings.length)lines.push('  none reported')
    else for(const h of item.holdings)lines.push(`  ${h.asset}: ${h.amount}`)
  }
  lines.push('','Sources: live mempool.space address API + Counterparty Core API v2. Read-only; no signing or broadcasting.')
  return lines.join('\n')
}
