export type BitcoinAddressType='legacy'|'segwit'|'taproot'|'unknown'
export type SignerCapabilities={rawTransaction:boolean;psbt:boolean;legacy:boolean;segwit:boolean;taproot:boolean}
export type AdapterSession={address:string;network:string;addressType:BitcoinAddressType}
export type BitcoinSignerProvider={name?:string;connect?:()=>Promise<{address:string;network?:string}>;disconnect?:()=>Promise<void>|void;signRawTransaction?:(hex:string)=>Promise<string>;signPsbt?:(psbt:string,options?:unknown)=>Promise<string>;capabilities?:Partial<SignerCapabilities>}

export function addressType(address:string):BitcoinAddressType{
 const a=address.trim().toLowerCase()
 if(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address))return'legacy'
 if(/^bc1q[ac-hj-np-z02-9]{11,71}$/.test(a))return'segwit'
 if(/^bc1p[ac-hj-np-z02-9]{11,71}$/.test(a))return'taproot'
 return'unknown'
}
function defaults(p:BitcoinSignerProvider):SignerCapabilities{
 const raw=typeof p.signRawTransaction==='function',psbt=typeof p.signPsbt==='function'
 return{rawTransaction:raw,psbt,legacy:raw,segwit:raw,taproot:false,...p.capabilities}
}
export class BitcoinSignerAdapter{
 constructor(readonly provider:BitcoinSignerProvider){}
 get name(){return this.provider.name||'Connected Bitcoin wallet'}
 capabilities(){return defaults(this.provider)}
 health(){const c=this.capabilities();return{available:typeof this.provider.connect==='function'&&c.rawTransaction,name:this.name,capabilities:c}}
 async connect():Promise<AdapterSession>{
  if(typeof this.provider.connect!=='function'||typeof this.provider.signRawTransaction!=='function')throw new Error('Wallet does not expose NEOpay raw-transaction signing yet. PSBT-only wallets are detected but remain read-only until the PSBT constructor is enabled.')
  const s=await this.provider.connect();if(!s?.address)throw new Error('Wallet did not return a Bitcoin address.')
  const network=String(s.network||'mainnet').toLowerCase();if(!['mainnet','bitcoin','livenet'].includes(network))throw new Error(`NEOpay requires Bitcoin mainnet. Wallet reported ${s.network||'an unsupported network'}.`)
  const type=addressType(s.address);if(type==='unknown')throw new Error('Wallet returned an unsupported Bitcoin address type.')
  const c=this.capabilities();if(type==='legacy'&&!c.legacy)throw new Error('Wallet cannot sign legacy Bitcoin transactions.');if(type==='segwit'&&!c.segwit)throw new Error('Wallet cannot sign SegWit Bitcoin transactions.');if(type==='taproot'&&!c.taproot)throw new Error('Wallet cannot safely sign Taproot transactions through this adapter.')
  return{address:s.address,network:'mainnet',addressType:type}
 }
 async disconnect(){await this.provider.disconnect?.()}
 async signRawTransaction(hex:string){if(typeof this.provider.signRawTransaction!=='function')throw new Error('Wallet cannot sign raw Bitcoin transactions.');const signed=await this.provider.signRawTransaction(hex);if(!/^[0-9a-fA-F]{100,400000}$/.test(String(signed||''))||signed.length%2)throw new Error('Wallet returned an invalid signed transaction.');return signed}
}
export function detectBitcoinSigner(provider?:BitcoinSignerProvider){return provider?new BitcoinSignerAdapter(provider):null}
