import{getBitcoinAddressSummary,getBitcoinUtxos}from'./bitcoinService'
import{getAddressBalances,getApiHealth,getAsset,isLikelyBitcoinAddress}from'./counterpartyService'
import{routerProviders}from'./routerClient'
import{assessDestination}from'./walletSecurity'

export type PreflightSummary=Record<string,string|number|boolean|undefined>
export type PreflightResult={ok:true;source:string;feeReserveSats:number;spendableSats:number;counterpartyOnline:boolean;bitcoinReadProvider:string;bitcoinBroadcastProvider:string;counterpartyProvider:string;checkedAt:string;destinationWarning?:string}
const MIN_FEE_RESERVE_SATS=1_000
function amountFromBalance(row:any,divisible:boolean){const raw=Number(row?.quantity??0);if(!Number.isFinite(raw))return 0;return divisible?raw/100_000_000:raw}
async function assertAssetBalance(source:string,summary:PreflightSummary){
 let asset='',required=0;const action=String(summary.action||'').toLowerCase()
 if(action==='send'){asset=String(summary.asset||'').toUpperCase();required=Number(summary.amount||0)}else if(action==='order'){const side=String(summary.side||'').toUpperCase(),amount=Number(summary.amount||0),price=Number(summary.price||0);if(side==='BUY'){asset='XCP';required=amount*price}if(side==='SELL'){asset='NOMNI';required=amount}}
 if(!asset||!Number.isFinite(required)||required<=0)return
 const[balances,metaRaw]=await Promise.all([getAddressBalances(source),getAsset(asset)]),rows=Array.isArray(balances)?balances:(balances?.result??[]),row=rows.find((b:any)=>String(b?.asset||'').toUpperCase()===asset),meta=metaRaw?.result??metaRaw,divisible=meta?.divisible!==false,available=amountFromBalance(row,divisible)
 if(available+Number.EPSILON<required)throw new Error(`Preflight failed: ${asset} balance ${available.toLocaleString()} is below required ${required.toLocaleString()}.`)
}
export async function runTransactionPreflight(source:string,summary:PreflightSummary):Promise<PreflightResult>{
 const address=source.trim(),action=String(summary.action||'').toLowerCase(),nativeBtc=action==='btc-send';if(!isLikelyBitcoinAddress(address))throw new Error('Preflight failed: transaction source is not a valid Bitcoin address.')
 let destinationWarning:string|undefined
 if(action==='send'||nativeBtc){const destination=String(summary.destination||'').trim(),assessment=assessDestination(address,destination);if(!assessment.allowed)throw new Error(`Preflight failed: ${assessment.warning||'destination blocked by wallet security policy.'}`);destinationWarning=assessment.warning}
 const[cpProviders,btcReadProviders,btcBroadcastProviders]=await Promise.all([routerProviders('counterparty.read'),routerProviders('btc.read'),routerProviders('btc.broadcast')]);if(!btcReadProviders.length)throw new Error('Preflight failed: no healthy Bitcoin read provider is available.');if(!btcBroadcastProviders.length)throw new Error('Preflight failed: no healthy Bitcoin broadcast provider is available.');if(!nativeBtc&&!cpProviders.length)throw new Error('Preflight failed: no healthy Counterparty provider is available.')
 const btcWork=Promise.all([getBitcoinAddressSummary(address),getBitcoinUtxos(address)]);const healthWork=nativeBtc?Promise.resolve(null):getApiHealth();const[[btc,utxos],health]=await Promise.all([btcWork,healthWork]);if(!nativeBtc&&!health)throw new Error('Preflight failed: Counterparty API health check returned no data.')
 const spendableFromUtxos=(Array.isArray(utxos)?utxos:[]).reduce((sum:number,u:any)=>sum+Math.max(0,Number(u?.value||0)),0),spendableSats=Math.max(spendableFromUtxos,Number(btc?.total||0)),feeReserveSats=Math.max(MIN_FEE_RESERVE_SATS,Number(summary.networkFeeSats||0))
 if(nativeBtc){const amountSats=Math.round(Number(summary.amount||0)*100_000_000);if(!Number.isSafeInteger(amountSats)||amountSats<=0)throw new Error('Preflight failed: invalid native BTC amount.');if(spendableSats<amountSats+feeReserveSats)throw new Error(`Preflight failed: BTC balance is below the requested amount plus ${feeReserveSats.toLocaleString()} sats network fee.`)}else{if(spendableSats<feeReserveSats)throw new Error(`Preflight failed: wallet needs at least ${feeReserveSats.toLocaleString()} sats available for Bitcoin network fees.`);await assertAssetBalance(address,summary)}
 return{ok:true,source:address,feeReserveSats,spendableSats,counterpartyOnline:!nativeBtc,bitcoinReadProvider:btcReadProviders[0].name||btcReadProviders[0].id,bitcoinBroadcastProvider:btcBroadcastProviders[0].name||btcBroadcastProviders[0].id,counterpartyProvider:nativeBtc?'Not required for native BTC':(cpProviders[0].name||cpProviders[0].id),checkedAt:new Date().toISOString(),destinationWarning}
}
