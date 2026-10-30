// Counterparty API v2 observation, NOT Bitcoin Core RPC or asset custody.
// Reuses the exact documented mainnet endpoint already used by NEO Explorer.
export const COUNTERPARTY_MAINNET_URL='https://api.counterparty.io:4000/v2/'

export async function observeCounterpartyMainnet({fetchImpl=fetch,timeoutMs=8000}={}){
  if(typeof fetchImpl!=='function')throw new Error('COUNTERPARTY_FETCH_REQUIRED')
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<100||timeoutMs>15000)throw new Error('COUNTERPARTY_TIMEOUT_INVALID')
  let response
  try{
    response=await fetchImpl(COUNTERPARTY_MAINNET_URL,{
      method:'GET',redirect:'error',credentials:'omit',cache:'no-store',
      headers:{accept:'application/json'},signal:AbortSignal.timeout(timeoutMs)
    })
  }catch{throw new Error('COUNTERPARTY_MAINNET_UNAVAILABLE')}
  if(!response?.ok)throw new Error('COUNTERPARTY_MAINNET_UNAVAILABLE')
  const length=Number(response.headers?.get?.('content-length')||0)
  if(length>256000)throw new Error('COUNTERPARTY_RESPONSE_TOO_LARGE')
  let root
  try{
    const body=await response.text()
    if(body.length>256000)throw new Error('too large')
    root=JSON.parse(body)
  }catch{throw new Error('COUNTERPARTY_MAINNET_INVALID_RESPONSE')}
  const result=root?.result
  if(!result||typeof result!=='object'||Array.isArray(result)||
    result.network!=='mainnet')throw new Error('COUNTERPARTY_NOT_BITCOIN_MAINNET')
  const height=result.backend_height
  const counterpartyHeight=result.counterparty_height
  if(!Number.isSafeInteger(height)||height<1||
    !Number.isSafeInteger(counterpartyHeight)||counterpartyHeight<1||
    counterpartyHeight>height||height-counterpartyHeight>1||
    result.server_ready!==true||result.ledger_state!=='Following'||
    String(response.headers?.get?.('X-COUNTERPARTY-READY')||'true').toLowerCase()==='false'){
    throw new Error('COUNTERPARTY_MAINNET_NOT_READY')
  }
  return Object.freeze({
    source:COUNTERPARTY_MAINNET_URL,
    network:'bitcoin-mainnet',
    protocol:'counterparty',
    bitcoinHeight:height,
    counterpartyHeight,
    ledgerState:'Following',
    serverReady:true,
    readOnly:true,
    coreRpcVerified:false,
    sameOperatorNodeVerified:false,
    signingEnabled:false,
    broadcastingEnabled:false
  })
}
