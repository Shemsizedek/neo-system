export type SignerState={available:boolean;connected:boolean;name:string;address?:string;network?:string}
export type SignRequest={unsignedTxHex:string;summary:{market:string;side:'BUY'|'SELL';amount:number;price:number;total:number;source:string}}

declare global{interface Window{neoBitcoinSigner?:{name?:string;connect?:()=>Promise<{address:string;network?:string}>;disconnect?:()=>Promise<void>|void;signRawTransaction?:(hex:string)=>Promise<string>}}}

export class NEOpaySigner{
  private provider(){return window.neoBitcoinSigner}
  state():SignerState{const p=this.provider();return{available:!!p&&typeof p.signRawTransaction==='function',connected:false,name:p?.name||'Browser signer'}}
  async connect():Promise<SignerState>{const p=this.provider();if(!p||typeof p.connect!=='function'||typeof p.signRawTransaction!=='function')return{available:false,connected:false,name:p?.name||'Browser signer'};const session=await p.connect();if(!session?.address)throw new Error('Signer did not return an address.');return{available:true,connected:true,name:p.name||'Browser signer',address:session.address,network:session.network||'mainnet'}}
  async disconnect(){await this.provider()?.disconnect?.()}
  async sign(req:SignRequest){const p=this.provider();if(!p||typeof p.signRawTransaction!=='function')throw new Error('Transaction signing is not connected.');if(!/^[0-9a-fA-F]{100,400000}$/.test(req.unsignedTxHex)||req.unsignedTxHex.length%2)throw new Error('Unsigned transaction payload is invalid.');const signed=await p.signRawTransaction(req.unsignedTxHex);if(!/^[0-9a-fA-F]{100,400000}$/.test(String(signed||''))||signed.length%2)throw new Error('Signer returned an invalid signed transaction.');return signed}
}

export const neoPaySigner=new NEOpaySigner()

export function extractUnsignedTxHex(composeResponse:any){const root=composeResponse?.result??composeResponse;const candidates=[root?.rawtransaction,root?.raw_transaction,root?.unsigned_tx_hex,root?.tx_hex,typeof root==='string'?root:null];const hex=candidates.find((v:any)=>typeof v==='string'&&/^[0-9a-fA-F]{100,400000}$/.test(v)&&v.length%2===0);if(!hex)throw new Error('Counterparty compose response did not contain a signable unsigned transaction.');return hex}
