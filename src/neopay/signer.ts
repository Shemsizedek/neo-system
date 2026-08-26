import{runTransactionPreflight}from'./preflight'
import{buildTransactionReview,requestTransactionApproval}from'./transactionReview'
import{clearPendingTransactionReview,setPendingTransactionReview}from'./receiptCenter'
import{detectBitcoinSigner,type BitcoinAddressType,type BitcoinSignerProvider,type SignerCapabilities}from'./signerAdapters'
import{requireNotLockedDown}from'./emergencyLockdown'

export type SignerState={available:boolean;connected:boolean;name:string;address?:string;network?:string;addressType?:BitcoinAddressType;capabilities?:SignerCapabilities;expiresAt?:number}
export type SignRequest={unsignedTxHex:string;summary:Record<string,string|number|boolean|undefined>}

declare global{interface Window{neoBitcoinSigner?:BitcoinSignerProvider}}
const SESSION_TIMEOUT_MS=10*60*1000
export class NEOpaySigner{
 private session:SignerState={available:false,connected:false,name:'Connected wallet'};private lockTimer:number|undefined
 private adapter(){return detectBitcoinSigner(window.neoBitcoinSigner)}
 private clearTimer(){if(this.lockTimer!==undefined){window.clearTimeout(this.lockTimer);this.lockTimer=undefined}}
 private armTimer(){this.clearTimer();if(!this.session.connected)return;const expiresAt=Date.now()+SESSION_TIMEOUT_MS;this.session={...this.session,expiresAt};this.lockTimer=window.setTimeout(()=>{void this.lock()},SESSION_TIMEOUT_MS)}
 state():SignerState{const a=this.adapter();const h=a?.health();if(!a||!h?.available){this.clearTimer();this.session={available:false,connected:false,name:h?.name||'Connected wallet',capabilities:h?.capabilities};return this.session}if(this.session.connected){if(this.session.expiresAt&&Date.now()>=this.session.expiresAt){void this.lock();return{available:true,connected:false,name:a.name,capabilities:h.capabilities}}return{...this.session,available:true,name:a.name,capabilities:h.capabilities}}return{available:true,connected:false,name:a.name,capabilities:h.capabilities}}
 async connect(){requireNotLockedDown();const a=this.adapter();if(!a){this.session={available:false,connected:false,name:'Connected wallet'};return this.session}const h=a.health();if(!h.available){this.session={available:false,connected:false,name:a.name,capabilities:h.capabilities};return this.session}const s=await a.connect();this.session={available:true,connected:true,name:a.name,address:s.address,network:s.network,addressType:s.addressType,capabilities:h.capabilities};this.armTimer();return{...this.session}}
 async lock(){clearPendingTransactionReview();this.clearTimer();try{await this.adapter()?.disconnect()}catch{}const a=this.adapter(),h=a?.health();this.session={available:!!h?.available,connected:false,name:a?.name||'Connected wallet',capabilities:h?.capabilities}}
 async disconnect(){await this.lock()}
 async sign(req:SignRequest){requireNotLockedDown();const a=this.adapter();if(this.session.expiresAt&&Date.now()>=this.session.expiresAt){await this.lock();throw new Error('Signer session expired. Reconnect your wallet to continue.')}if(!a||!this.session.connected||!this.session.address)throw new Error('Connect a compatible wallet to approve this transaction.');this.armTimer();if(!/^[0-9a-fA-F]{100,400000}$/.test(req.unsignedTxHex)||req.unsignedTxHex.length%2)throw new Error('Unsigned transaction payload is invalid.');const source=typeof req.summary?.source==='string'?req.summary.source.trim():'';if(!source)throw new Error('Transaction source address is missing from the approval summary.');if(source.toLowerCase()!==this.session.address.toLowerCase())throw new Error(`Connected wallet ${this.session.address} does not control transaction source ${source}. Load the signer address before approving.`);const preflight=await runTransactionPreflight(source,req.summary);const review=buildTransactionReview(req.unsignedTxHex,req.summary,preflight);if(!requestTransactionApproval(review)){clearPendingTransactionReview();throw new Error('Transaction approval cancelled.')}setPendingTransactionReview(review);try{const signed=await a.signRawTransaction(req.unsignedTxHex);this.armTimer();return signed}catch(e){clearPendingTransactionReview();throw e}}
}
export const neoPaySigner=new NEOpaySigner()
export function extractUnsignedTxHex(composeResponse:any){const root=composeResponse?.result??composeResponse;const candidates=[root?.rawtransaction,root?.raw_transaction,root?.unsigned_tx_hex,root?.tx_hex,root?.psbt,typeof root==='string'?root:null];const hex=candidates.find((v:any)=>typeof v==='string'&&/^[0-9a-fA-F]{100,400000}$/.test(v)&&v.length%2===0);if(!hex)throw new Error('Transaction composer did not return signable transaction hex.');return hex}
