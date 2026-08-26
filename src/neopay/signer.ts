import{runTransactionPreflight}from'./preflight'
import{buildTransactionReview,requestTransactionApproval}from'./transactionReview'
import{clearPendingTransactionReview,setPendingTransactionReview}from'./receiptCenter'

export type SignerState={available:boolean;connected:boolean;name:string;address?:string;network?:string;expiresAt?:number}
export type SignRequest={unsignedTxHex:string;summary:Record<string,string|number|boolean|undefined>}

declare global{interface Window{neoBitcoinSigner?:{name?:string;connect?:()=>Promise<{address:string;network?:string}>;disconnect?:()=>Promise<void>|void;signRawTransaction?:(hex:string)=>Promise<string>}}}

const SESSION_TIMEOUT_MS=10*60*1000

export class NEOpaySigner{
  private session:SignerState={available:false,connected:false,name:'Connected wallet'}
  private lockTimer:number|undefined
  private provider(){return window.neoBitcoinSigner}
  private clearTimer(){if(this.lockTimer!==undefined){window.clearTimeout(this.lockTimer);this.lockTimer=undefined}}
  private armTimer(){
    this.clearTimer()
    if(!this.session.connected)return
    const expiresAt=Date.now()+SESSION_TIMEOUT_MS
    this.session={...this.session,expiresAt}
    this.lockTimer=window.setTimeout(()=>{void this.lock('Signer session auto-locked after 10 minutes of inactivity.')},SESSION_TIMEOUT_MS)
  }
  state():SignerState{
    const p=this.provider()
    if(!p||typeof p.signRawTransaction!=='function'){
      this.clearTimer()
      this.session={available:false,connected:false,name:p?.name||'Connected wallet'}
      return this.session
    }
    if(this.session.connected){
      if(this.session.expiresAt&&Date.now()>=this.session.expiresAt){void this.lock();return{available:true,connected:false,name:p.name||'Connected wallet'}}
      return{...this.session,available:true,name:p.name||this.session.name||'Connected wallet'}
    }
    return{available:true,connected:false,name:p.name||'Connected wallet'}
  }
  async connect():Promise<SignerState>{
    const p=this.provider()
    if(!p||typeof p.connect!=='function'||typeof p.signRawTransaction!=='function'){
      this.session={available:false,connected:false,name:p?.name||'Connected wallet'}
      return this.session
    }
    const session=await p.connect()
    if(!session?.address)throw new Error('Wallet did not return an address.')
    const network=String(session.network||'mainnet').toLowerCase()
    if(!['mainnet','bitcoin','livenet'].includes(network))throw new Error(`NEOpay requires Bitcoin mainnet. Wallet reported ${session.network||'an unsupported network'}.`)
    this.session={available:true,connected:true,name:p.name||'Connected wallet',address:session.address,network:'mainnet'}
    this.armTimer()
    return{...this.session}
  }
  async lock(_reason?:string){
    clearPendingTransactionReview()
    this.clearTimer()
    try{await this.provider()?.disconnect?.()}catch{}
    const p=this.provider()
    this.session={available:!!p&&typeof p.signRawTransaction==='function',connected:false,name:p?.name||'Connected wallet'}
  }
  async disconnect(){await this.lock()}
  async sign(req:SignRequest){
    const p=this.provider()
    if(this.session.expiresAt&&Date.now()>=this.session.expiresAt){await this.lock();throw new Error('Signer session expired. Reconnect your wallet to continue.')}
    if(!p||typeof p.signRawTransaction!=='function'||!this.session.connected||!this.session.address)throw new Error('Connect a compatible wallet to approve this transaction.')
    this.armTimer()
    if(!/^[0-9a-fA-F]{100,400000}$/.test(req.unsignedTxHex)||req.unsignedTxHex.length%2)throw new Error('Unsigned transaction payload is invalid.')
    const source=typeof req.summary?.source==='string'?req.summary.source.trim():''
    if(!source)throw new Error('Transaction source address is missing from the approval summary.')
    if(source.toLowerCase()!==this.session.address.toLowerCase())throw new Error(`Connected wallet ${this.session.address} does not control transaction source ${source}. Load the signer address before approving.`)
    const preflight=await runTransactionPreflight(source,req.summary)
    const review=buildTransactionReview(req.unsignedTxHex,req.summary,preflight)
    if(!requestTransactionApproval(review)){clearPendingTransactionReview();throw new Error('Transaction approval cancelled.')}
    setPendingTransactionReview(review)
    try{
      const signed=await p.signRawTransaction(req.unsignedTxHex)
      if(!/^[0-9a-fA-F]{100,400000}$/.test(String(signed||''))||signed.length%2)throw new Error('Wallet returned an invalid transaction.')
      this.armTimer()
      return signed
    }catch(e){clearPendingTransactionReview();throw e}
  }
}

export const neoPaySigner=new NEOpaySigner()

export function extractUnsignedTxHex(composeResponse:any){const root=composeResponse?.result??composeResponse;const candidates=[root?.rawtransaction,root?.raw_transaction,root?.unsigned_tx_hex,root?.tx_hex,root?.psbt,typeof root==='string'?root:null];const hex=candidates.find((v:any)=>typeof v==='string'&&/^[0-9a-fA-F]{100,400000}$/.test(v)&&v.length%2===0);if(!hex)throw new Error('Transaction composer did not return signable transaction hex.');return hex}
