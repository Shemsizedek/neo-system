import{isLikelyBitcoinAddress}from'./counterpartyService'

const PREFS_KEY='neopay.security.v1'
const BOOK_KEY='neopay.addressbook.v1'

export type SecurityPreferences={privacyMode:boolean;warnUnknownDestination:boolean;blockedAddresses:string[]}
export type AddressBookEntry={label:string;address:string;createdAt:string;trusted:boolean}

const defaults:SecurityPreferences={privacyMode:false,warnUnknownDestination:true,blockedAddresses:[]}

function safeParse<T>(raw:string|null,fallback:T):T{try{return raw?JSON.parse(raw) as T:fallback}catch{return fallback}}
export function loadSecurityPreferences():SecurityPreferences{
 if(typeof window==='undefined')return defaults
 const value=safeParse<Partial<SecurityPreferences>>(localStorage.getItem(PREFS_KEY),{})
 return{privacyMode:Boolean(value.privacyMode),warnUnknownDestination:value.warnUnknownDestination!==false,blockedAddresses:Array.isArray(value.blockedAddresses)?value.blockedAddresses.filter(x=>typeof x==='string'):[]}
}
export function saveSecurityPreferences(value:SecurityPreferences){if(typeof window!=='undefined')localStorage.setItem(PREFS_KEY,JSON.stringify(value))}
export function loadAddressBook():AddressBookEntry[]{
 if(typeof window==='undefined')return[]
 const rows=safeParse<any[]>(localStorage.getItem(BOOK_KEY),[])
 return rows.filter(x=>x&&typeof x.label==='string'&&typeof x.address==='string'&&isLikelyBitcoinAddress(x.address)).slice(0,250)
}
export function saveAddressBook(entries:AddressBookEntry[]){if(typeof window!=='undefined')localStorage.setItem(BOOK_KEY,JSON.stringify(entries.slice(0,250)))}
export function upsertAddressBookEntry(label:string,address:string,trusted=true){
 const clean=address.trim();if(!isLikelyBitcoinAddress(clean))throw new Error('Address book entry must contain a valid Bitcoin address.')
 const rows=loadAddressBook().filter(x=>x.address.toLowerCase()!==clean.toLowerCase())
 rows.unshift({label:label.trim().slice(0,80)||'Saved address',address:clean,createdAt:new Date().toISOString(),trusted})
 saveAddressBook(rows);return rows
}
export function removeAddressBookEntry(address:string){const rows=loadAddressBook().filter(x=>x.address.toLowerCase()!==address.trim().toLowerCase());saveAddressBook(rows);return rows}
export function setBlockedAddress(address:string,blocked=true){
 const clean=address.trim();if(!isLikelyBitcoinAddress(clean))throw new Error('Blocked entry must be a valid Bitcoin address.')
 const prefs=loadSecurityPreferences();const set=new Set(prefs.blockedAddresses.map(x=>x.toLowerCase()))
 blocked?set.add(clean.toLowerCase()):set.delete(clean.toLowerCase())
 const next={...prefs,blockedAddresses:[...set]};saveSecurityPreferences(next);return next
}
export type DestinationAssessment={allowed:boolean;trusted:boolean;warning?:string}
export function assessDestination(source:string,destination:string):DestinationAssessment{
 const dest=destination.trim(),src=source.trim()
 if(!isLikelyBitcoinAddress(dest))return{allowed:false,trusted:false,warning:'Destination is not a valid Bitcoin address.'}
 const prefs=loadSecurityPreferences()
 if(prefs.blockedAddresses.some(x=>x.toLowerCase()===dest.toLowerCase()))return{allowed:false,trusted:false,warning:'Destination is blocked in NEOpay security settings.'}
 if(src&&src.toLowerCase()===dest.toLowerCase())return{allowed:true,trusted:false,warning:'Destination is the same as the source wallet. Verify that this self-transfer is intentional.'}
 const book=loadAddressBook(),entry=book.find(x=>x.address.toLowerCase()===dest.toLowerCase())
 if(entry?.trusted)return{allowed:true,trusted:true}
 if(prefs.warnUnknownDestination)return{allowed:true,trusted:false,warning:'Destination is not in your trusted NEOpay address book. Verify the full address before approving.'}
 return{allowed:true,trusted:false}
}
