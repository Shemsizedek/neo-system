import {restrictedBvmBitcoinRpc} from './shared-bitcoin-core.mjs'
import {observeCounterpartyMainnet} from './counterparty-mainnet.mjs'

/**
 * Corroborate independent MAINNET observations without claiming that the
 * Counterparty API and the operator's Bitcoin Core RPC share a physical node.
 * Does not call any wallet, signing, mempool-submission, or transaction method.
 * A Bitcoin Core client must be supplied by an authorized runtime; the public
 * Counterparty endpoint is never used as a substitute for Core RPC.
 */
export async function attestBitcoinCounterpartyMainnet({
  bitcoinRpc,
  counterpartyFetch=fetch,
  maxBlockDrift=2,
  now=()=>new Date().toISOString()
}={}){
  if(!Number.isSafeInteger(maxBlockDrift)||maxBlockDrift<0||maxBlockDrift>2){
    throw new Error('MAINNET_ATTESTATION_DRIFT_POLICY_INVALID')
  }
  const readCore=restrictedBvmBitcoinRpc(bitcoinRpc)
  const core=await readCore('getblockchaininfo',[])
  if(core?.chain!=='main')throw new Error('MAINNET_ATTESTATION_CORE_NETWORK_MISMATCH')
  const blocks=core?.blocks,headers=core?.headers
  if(!Number.isSafeInteger(blocks)||blocks<1||
     !Number.isSafeInteger(headers)||headers<blocks||headers-blocks>2||
     core?.initialblockdownload!==false){
    throw new Error('MAINNET_ATTESTATION_CORE_NOT_SYNCED')
  }
  const network=await readCore('getnetworkinfo',[])
  if(network?.networkactive!==true)throw new Error('MAINNET_ATTESTATION_CORE_NETWORK_INACTIVE')
  const counterparty=await observeCounterpartyMainnet({fetchImpl:counterpartyFetch})
  const drift=Math.abs(counterparty.bitcoinHeight-blocks)
  if(drift>maxBlockDrift)throw new Error('MAINNET_ATTESTATION_HEIGHT_DIVERGENCE')
  return Object.freeze({
    network:'bitcoin-mainnet',
    readOnly:true,
    coreChainVerified:true,
    counterpartyNetworkVerified:true,
    heightsConsistent:true,
    heightDrift:drift,
    bitcoinCoreHeight:blocks,
    counterpartyBackendHeight:counterparty.bitcoinHeight,
    counterpartyIndexedHeight:counterparty.counterpartyHeight,
    // Matching chain heights proves neither the same node nor the same tip.
    sameTipHashVerified:false,
    sameOperatorNodeVerified:false,
    coreIdentityVerified:false,
    signingEnabled:false,
    broadcastingEnabled:false,
    sourceType:'independent_bitcoin_core_and_counterparty_api_v2',
    observedAt:now()
  })
}
