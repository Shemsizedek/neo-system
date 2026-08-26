import{registerBroadcastReceipt}from'./receiptCenter'

export type PsbtWalletSession={address:string;network:'mainnet';providerId:string;providerName:string}
export type PsbtSettlementResult={txid:string;psbt?:string;providerId:string;providerName:string}
export type PsbtWalletAdapter={id:string;name:string;detected:()=>boolean;connect:()=>Promise<PsbtWalletSession>;signAndBroadcast:(psbtHex:string,address:string,inputCount:number)=>Promise<PsbtSettlementResult>}

type XverseRequest=(method:string,params?:any)=>Promise<any>
type XverseProvider={request?:XverseRequest}
declare global{interface Window{BitcoinProvider?:XverseProvider;satsConnectRequest?:XverseRequest}}

function hexToBase64(hex:string){let s='';for(let i=0;i<hex.length;i+=2)s+=String.fromCharCode(parseInt(hex.slice(i,i+2),16));return btoa(s)}
function pickAddress(payload:any){const root=payload?.result??payload?.data??payload;const rows=Array.isArray(root)?root:Array.isArray(root?.addresses)?root.addresses:Array.isArray(root?.accounts)?root.accounts:[];const payment=rows.find((x:any)=>String(x?.purpose||x?.type||'').toLowerCase().includes('payment'))||rows[0];return typeof payment==='string'?payment:String(payment?.address||payment?.btcAddress||'')}
function ensureMainnet(network:any){const n=String(network?.name??network??'mainnet').toLowerCase();if(!['mainnet','bitcoin','livenet'].includes(n))throw new Error(`NEOpay requires Bitcoin mainnet. Wallet reported ${n}.`)}
function parseSuccess(response:any){if(response?.status&&String(response.status).toLowerCase()!=='success')throw new Error(response?.error?.message||'Wallet rejected the PSBT request.');return response?.result??response?.data??response}
function validTxid(v:any){const s=String(v||'').trim();if(!/^[0-9a-fA-F]{64}$/.test(s))throw new Error('Wallet did not return a valid Bitcoin transaction ID.');return s}

function xverseRequest(){return window.satsConnectRequest||window.BitcoinProvider?.request}
export const xversePsbtAdapter:PsbtWalletAdapter={
 id:'xverse',name:'Xverse / Sats Connect',detected:()=>typeof xverseRequest()==='function',
 async connect(){const request=xverseRequest();if(!request)throw new Error('Xverse/Sats Connect provider is not available.');let response:any;try{response=await request('getAccounts',{purposes:['payment'],message:'Connect NEOpay to your Bitcoin payment address.'})}catch{response=await request('getAddresses',{purposes:['payment'],message:'Connect NEOpay to your Bitcoin payment address.'})}const root=parseSuccess(response);const address=pickAddress(root);if(!address)throw new Error('Xverse did not return a Bitcoin payment address.');ensureMainnet(root?.network||response?.network);return{address,network:'mainnet',providerId:'xverse',providerName:'Xverse / Sats Connect'}},
 async signAndBroadcast(psbtHex,address,inputCount){const request=xverseRequest();if(!request)throw new Error('Xverse/Sats Connect provider is not available.');if(!/^(70736274ff)[0-9a-fA-F]+$/.test(psbtHex))throw new Error('NEOpay PSBT payload is invalid.');const indices=Array.from({length:inputCount},(_,i)=>i),response=await request('signPsbt',{psbt:hexToBase64(psbtHex),broadcast:true,signInputs:{[address]:indices}});const result=parseSuccess(response);const txid=validTxid(result?.txid||result?.transactionId||result?.id);registerBroadcastReceipt(txid);return{txid,psbt:result?.psbt,providerId:'xverse',providerName:'Xverse / Sats Connect'}}
}

export function discoverPsbtWalletAdapters(){return[xversePsbtAdapter].map(a=>({id:a.id,name:a.name,detected:a.detected()}))}
export function getPsbtWalletAdapter(id:string){return[xversePsbtAdapter].find(a=>a.id===id)||null}
