import{getBitcoinUtxos}from'./bitcoinService'
import{addressToScript,type NativeBitcoinPlan}from'./nativeBitcoin'

function hexToBytes(hex:string){if(hex.length%2)throw new Error('Invalid transaction hex.');const out:number[]=[];for(let i=0;i<hex.length;i+=2)out.push(parseInt(hex.slice(i,i+2),16));return out}
function bytesToHex(bytes:number[]|Uint8Array){return Array.from(bytes).map(v=>v.toString(16).padStart(2,'0')).join('')}
function u64le(n:number){let x=BigInt(n);const out:number[]=[];for(let i=0;i<8;i++){out.push(Number(x&255n));x>>=8n}return out}
function varint(n:number){if(n<0xfd)return[n];if(n<=0xffff)return[0xfd,n&255,(n>>>8)&255];if(n<=0xffffffff)return[0xfe,n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];throw new Error('PSBT value too large.')}
function readVarint(b:number[],o:number){const x=b[o];if(x<0xfd)return{x,next:o+1};if(x===0xfd)return{x:b[o+1]|(b[o+2]<<8),next:o+3};if(x===0xfe)return{x:(b[o+1]|(b[o+2]<<8)|(b[o+3]<<16)|(b[o+4]<<24))>>>0,next:o+5};throw new Error('64-bit varint is not supported in NEOpay PSBT parsing.')}
function reverseHexBytes(bytes:number[]){return bytesToHex([...bytes].reverse())}
function mapEntry(key:number[],value:number[]){return[...varint(key.length),...key,...varint(value.length),...value]}

export type PsbtInputRef={txid:string;vout:number}
export type NativeBitcoinPsbt={psbtHex:string;unsignedTxHex:string;inputs:PsbtInputRef[];source:string;addressType:'segwit'|'taproot'}

function parseInputs(unsignedTxHex:string){
 const b=hexToBytes(unsignedTxHex);let o=4;const count=readVarint(b,o);o=count.next;const refs:PsbtInputRef[]=[]
 for(let i=0;i<count.x;i++){const txid=reverseHexBytes(b.slice(o,o+32));o+=32;const vout=(b[o]|(b[o+1]<<8)|(b[o+2]<<16)|(b[o+3]<<24))>>>0;o+=4;const sl=readVarint(b,o);o=sl.next+sl.x;o+=4;refs.push({txid,vout})}
 return refs
}

export async function buildNativeBitcoinPsbt(plan:NativeBitcoinPlan):Promise<NativeBitcoinPsbt>{
 const source=plan.source.trim(),lower=source.toLowerCase();const addressType=lower.startsWith('bc1p')?'taproot':lower.startsWith('bc1q')?'segwit':null
 if(!addressType)throw new Error('NEOpay PSBT signing currently supports native SegWit and Taproot source addresses. Legacy inputs remain on the raw-signing path.')
 const refs=parseInputs(plan.unsignedTxHex);if(!refs.length)throw new Error('Unsigned Bitcoin transaction has no inputs.')
 const utxos=await getBitcoinUtxos(source);const script=await addressToScript(source)
 const global=[...mapEntry([0x00],hexToBytes(plan.unsignedTxHex)),0x00]
 const inputMaps:number[]=[]
 for(const ref of refs){const u=(Array.isArray(utxos)?utxos:[]).find((x:any)=>String(x?.txid||'').toLowerCase()===ref.txid.toLowerCase()&&Number(x?.vout)===ref.vout);if(!u||!Number.isSafeInteger(Number(u.value))||Number(u.value)<=0)throw new Error(`PSBT input ${ref.txid}:${ref.vout} is missing from the wallet UTXO set.`);const witnessUtxo=[...u64le(Number(u.value)),...varint(script.length),...script];inputMaps.push(...mapEntry([0x01],witnessUtxo),0x00)}
 const outputMaps=new Array((plan.changeSats>=546?2:1)).fill(0x00)
 const psbt=[0x70,0x73,0x62,0x74,0xff,...global,...inputMaps,...outputMaps]
 return{psbtHex:bytesToHex(psbt),unsignedTxHex:plan.unsignedTxHex,inputs:refs,source,addressType}
}
