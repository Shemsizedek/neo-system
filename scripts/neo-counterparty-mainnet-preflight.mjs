import {observeCounterpartyMainnet} from '../server/neo-vm/counterparty-mainnet.mjs'

// Public, uncredentialed GET-only observation. Never touches Counterpay wallets,
// Bitcoin Core JSON-RPC, transaction signing or mainnet broadcasts.
try{
  const result=await observeCounterpartyMainnet({timeoutMs:12000})
  process.stdout.write(JSON.stringify({
    test:'neo-counterparty-mainnet-observation',
    network:result.network,
    protocol:result.protocol,
    bitcoinHeight:result.bitcoinHeight,
    counterpartyHeight:result.counterpartyHeight,
    ledgerState:result.ledgerState,
    upstreamReady:true,
    source:result.source,
    sameOperatorNodeVerified:false,
    mainnetWrites:false
  })+'\n')
}catch(error){
  process.stderr.write('COUNTERPARTY_MAINNET_PREFLIGHT_FAILED: '+String(error?.message||error)+'\n')
  process.exitCode=1
}
