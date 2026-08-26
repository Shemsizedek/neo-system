import{runTransactionPreflight}from'./preflight'
import{buildTransactionReview,requestTransactionApproval}from'./transactionReview'

export type SignerState={available:boolean;connected:boolean;name:string;address?:string;network?:string}
export type SignRequest={unsignedTxHex:string;summary:Record<string,string|number|boolean|undefined>}

declare global{interface Window{neoBitcoinSigner?:{name?:string;connect?:()=>Promise<{address:string;network?:string}>;disconnect?:()=>Promise<void>|void;signRawTransaction?:(hex:string)=>Promise<string>}}}

export class NEOpaySigner{
  private session:SignerState={available:false,connected:false,name:'Connected wallet'}
  private provider(){return window.neoBitcoinSigner}
  state():SignerState{
    const p=this.provider()
    if(!p||typeof p.signRawTransaction!=='function'){
      this.session={available:false,connected:false,name:p?.name||'Connected wallet'}
      return this.session
    }
    if(this.session.connected)return{...this.session,available:true,name:p.name||this.session.name||'Connected wallet'}
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
    return{...this.session}
  }
  async disconnect(){
    await this.provider()?.disconnect?.()
    const p=this.provider()
    this.session={available:!!p&&typeof p.signRawTransaction==='function',connected:false,name:p?.name||'Connected wallet'}
  }
  async sign(req:SignRequest){
    const p=this.provider()
    if(!p||typeof p.signRawTransaction!=='function'||!this.session.connected||!this.session.address)throw new Error('Connect a compatible wallet to approve this transaction.')
    if(!/^[0-9a-fA-F]{100,400000}$/.test(req.unsignedTxHex)||req.unsignedTxHex.length%2)throw new Error('Unsigned transaction payload is invalid.')
    const source=typeof req.summary?.source==='string'?req.summary.source.trim():''
    if(!source)throw new Error('Transaction source address is missing from the approval summary.')
    if(source.toLowerCase()!==this.session.address.toLowerCase())throw new Error(`Connected wallet ${this.session.address} does not control transaction source ${source}. Load the signer address before approving.`)
    const preflight=await runTransactionPreflight(source,req.summary)
    const review=buildTransactionReview(req.unsignedTxHex,req.summary,preflight)
    if(!requestTransactionApproval(review))throw new Error('Transaction approval cancelled.')
    const signed=await p.signRawTransaction(req.unsignedTxHex)
    if(!/^[0-9a-fA-F]{100,400000}$/.test(String(signed||''))||signed.length%2)throw new Error('Wallet returned an invalid transaction.')
    return signed
  }
}

export const neoPaySigner=new NEOpaySigner()

export function extractUnsignedTxHex(composeResponse:any){const root=composeResponse?.result??composeResponse;const candidates=[root?.rawtransaction,root?.raw_transaction,root?.unsigned_tx_hex,root?.tx_hex,root?.psbt,typeof root==='string'?root:null];const hex=candidates.find((v:any)=>typeof v==='string'&&/^[0-9a-fA-F]{100,400000}$/.test(v)&&v.length%2===0);if(!hex)throw new Error('Transaction composer did not return signable transaction hex.');return hex}
