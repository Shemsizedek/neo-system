export type WireDirectoryEntry={
  wireNumber:string
  neoId:string
  label:string
  bitcoinAddress?:string
  counterpartyAddress?:string
  lightningAddress?:string
  verified:boolean
  updatedAt:string
}

const KEY='neo-wire-directory-v1'
const defaults:WireDirectoryEntry[]=[{
  wireNumber:'+1 210 555 0144',neoId:'NEO-00000144',label:'NEO Wire Origin',verified:true,updatedAt:'2026-08-28T00:00:00.000Z'
}]

export function loadDirectory():WireDirectoryEntry[]{
  try{const raw=localStorage.getItem(KEY);return raw?JSON.parse(raw) as WireDirectoryEntry[]:defaults}catch{return defaults}
}
export function saveDirectory(entries:WireDirectoryEntry[]){localStorage.setItem(KEY,JSON.stringify(entries))}
export function upsertDirectoryEntry(entry:WireDirectoryEntry){
  const current=loadDirectory();const next=[entry,...current.filter(x=>x.wireNumber!==entry.wireNumber)];saveDirectory(next);return next
}
export function resolveWireNumber(wireNumber:string){return loadDirectory().find(x=>x.wireNumber.replace(/\D/g,'')===wireNumber.replace(/\D/g,''))}
