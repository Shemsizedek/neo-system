import{isLikelyBitcoinAddress}from'./counterpartyService'
import{listReceipts}from'./receiptCenter'

const CONTACTS_KEY='neopay.contacts.v1'

export type NEOpayContact={id:string;name:string;address:string;cesAccount?:string;note?:string;trusted:boolean;createdAt:string;updatedAt:string}
export type ParsedPaymentRequest={address:string;amountBtc?:number;label?:string;message?:string}

function safeParse<T>(raw:string|null,fallback:T):T{try{return raw?JSON.parse(raw) as T:fallback}catch{return fallback}}
function normalize(address:string){return address.trim()}
function idFor(address:string){return normalize(address).toLowerCase()}

export function loadContacts():NEOpayContact[]{
 if(typeof window==='undefined')return[]
 const rows=safeParse<any[]>(localStorage.getItem(CONTACTS_KEY),[])
 return rows.filter(x=>x&&typeof x.name==='string'&&typeof x.address==='string'&&isLikelyBitcoinAddress(x.address)).slice(0,250)
}
export function saveContacts(rows:NEOpayContact[]){if(typeof window!=='undefined')localStorage.setItem(CONTACTS_KEY,JSON.stringify(rows.slice(0,250)))}
export function upsertContact(input:{name:string;address:string;cesAccount?:string;note?:string;trusted?:boolean}){
 const address=normalize(input.address);if(!isLikelyBitcoinAddress(address))throw new Error('Contact must use a valid Bitcoin/Counterparty address.')
 const now=new Date().toISOString(),id=idFor(address),existing=loadContacts().find(x=>x.id===id)
 const contact:NEOpayContact={id,name:input.name.trim().slice(0,80)||'NEOpay Contact',address,cesAccount:input.cesAccount?.trim().slice(0,80)||undefined,note:input.note?.trim().slice(0,240)||undefined,trusted:input.trusted!==false,createdAt:existing?.createdAt||now,updatedAt:now}
 const next=[contact,...loadContacts().filter(x=>x.id!==id)];saveContacts(next);return next
}
export function removeContact(id:string){const next=loadContacts().filter(x=>x.id!==id);saveContacts(next);return next}
export function contactByAddress(address:string){const id=idFor(address);return loadContacts().find(x=>x.id===id)}

export function recentRecipients(limit=8){
 const seen=new Set<string>();const out:{address:string;lastUsed:string;count:number;contact?:NEOpayContact}[]=[]
 for(const receipt of listReceipts()){
  const address=String(receipt.review.destination||'').trim();if(!address||!isLikelyBitcoinAddress(address))continue
  const key=idFor(address),existing=out.find(x=>idFor(x.address)===key)
  if(existing){existing.count+=1;continue}
  if(seen.has(key))continue;seen.add(key);out.push({address,lastUsed:receipt.submittedAt,count:1,contact:contactByAddress(address)})
  if(out.length>=limit)break
 }
 return out
}

export function buildBitcoinPaymentUri(input:{address:string;amountBtc?:number;label?:string;message?:string}){
 if(!isLikelyBitcoinAddress(input.address))throw new Error('Payment request requires a valid Bitcoin address.')
 const params=new URLSearchParams()
 if(Number.isFinite(input.amountBtc)&&Number(input.amountBtc)>0)params.set('amount',Number(input.amountBtc).toFixed(8).replace(/0+$/,'').replace(/\.$/,''))
 if(input.label?.trim())params.set('label',input.label.trim().slice(0,80))
 if(input.message?.trim())params.set('message',input.message.trim().slice(0,120))
 const q=params.toString();return`bitcoin:${input.address}${q?`?${q}`:''}`
}

export function parseBitcoinPaymentRequest(value:string):ParsedPaymentRequest{
 const raw=value.trim()
 if(isLikelyBitcoinAddress(raw))return{address:raw}
 if(!raw.toLowerCase().startsWith('bitcoin:'))throw new Error('Paste a Bitcoin address or bitcoin: payment request.')
 const body=raw.slice(8),question=body.indexOf('?'),address=decodeURIComponent(question>=0?body.slice(0,question):body)
 if(!isLikelyBitcoinAddress(address))throw new Error('Payment request contains an invalid Bitcoin address.')
 const params=new URLSearchParams(question>=0?body.slice(question+1):'')
 for(const key of params.keys())if(key.startsWith('req-'))throw new Error(`Unsupported required payment parameter: ${key}`)
 const amountRaw=params.get('amount'),amount=amountRaw===null?undefined:Number(amountRaw)
 if(amount!==undefined&&(!Number.isFinite(amount)||amount<=0||amount>21_000_000))throw new Error('Payment request contains an invalid BTC amount.')
 return{address,amountBtc:amount,label:params.get('label')?.slice(0,80)||undefined,message:params.get('message')?.slice(0,120)||undefined}
}
export function qrImageUrl(data:string){return`https://quickchart.io/qr?size=240&margin=2&text=${encodeURIComponent(data)}`}
