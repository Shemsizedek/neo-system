import type{BitcoinSignerProvider,SignerCapabilities}from'./signerAdapters'

export type WalletProviderRecord={id:string;name:string;detected:boolean;compatible:boolean;mode:'raw'|'psbt'|'unavailable';capabilities:SignerCapabilities;note:string}

type UniSatLike={requestAccounts?:()=>Promise<string[]>;getAccounts?:()=>Promise<string[]>;getNetwork?:()=>Promise<string>;signPsbt?:(psbtHex:string,options?:unknown)=>Promise<string>}
declare global{interface Window{unisat?:UniSatLike}}

function caps(partial:Partial<SignerCapabilities>):SignerCapabilities{return{rawTransaction:false,psbt:false,legacy:false,segwit:false,taproot:false,...partial}}

export function discoverWalletProviders():WalletProviderRecord[]{
 const neo=window.neoBitcoinSigner
 const raw=!!neo&&typeof neo.connect==='function'&&typeof neo.signRawTransaction==='function'
 const rows:WalletProviderRecord[]=[{
  id:'neo-injected',name:neo?.name||'NEOpay-compatible injected signer',detected:!!neo,compatible:raw,mode:raw?'raw':'unavailable',capabilities:caps({rawTransaction:raw,psbt:typeof neo?.signPsbt==='function',legacy:raw,segwit:raw,taproot:Boolean(neo?.capabilities?.taproot)}),note:raw?'Ready for the current NEOpay raw-transaction pipeline.':'Detected only when a provider exposes connect() and signRawTransaction().'
 }]
 const unisat=window.unisat,detected=!!unisat
 rows.push({id:'unisat',name:'UniSat Wallet',detected,compatible:false,mode:detected&&typeof unisat?.signPsbt==='function'?'psbt':'unavailable',capabilities:caps({psbt:typeof unisat?.signPsbt==='function',legacy:true,segwit:true,taproot:true}),note:detected?'UniSat is detected through window.unisat. Its public browser API signs PSBTs, while NEOpay currently constructs raw unsigned transactions, so signing stays fail-closed until the PSBT constructor gate lands.':'Install/enable UniSat to make its browser provider detectable.'})
 return rows
}

export function createUniSatReadAdapter():BitcoinSignerProvider|null{
 const u=window.unisat;if(!u)return null
 return{name:'UniSat Wallet',capabilities:{rawTransaction:false,psbt:typeof u.signPsbt==='function',legacy:true,segwit:true,taproot:true},connect:async()=>{const accounts=await u.requestAccounts?.()||await u.getAccounts?.()||[];const address=accounts[0];if(!address)throw new Error('UniSat did not return an account.');const network=await u.getNetwork?.()||'livenet';return{address,network}},signPsbt:u.signPsbt?.bind(u)}
}
