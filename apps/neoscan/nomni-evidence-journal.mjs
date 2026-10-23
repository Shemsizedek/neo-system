import {mkdir,readFile,writeFile,rename,open} from 'node:fs/promises';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
const HEX=/^[0-9a-f]{64}$/;
const hash=x=>createHash('sha256').update(x).digest('hex');
export function createNomniEvidenceJournal({path}={}){
 if(typeof path!=='string'||!path)throw new TypeError('journal_path_required');
 async function read(){
  let raw;try{raw=await readFile(path,'utf8')}catch(e){if(e.code==='ENOENT')return [];throw e}
  const entries=raw.trim()?raw.trimEnd().split('\n').map(s=>JSON.parse(s)):[];
  let previous='0'.repeat(64);
  for(const row of entries){
   if(row.previous_hash!==previous||!HEX.test(row.entry_hash))throw new Error('journal_chain_broken');
   const {entry_hash,...body}=row;
   if(hash(JSON.stringify(body))!==entry_hash)throw new Error('journal_integrity_error');
   previous=entry_hash;
  }
  return entries;
 }
 async function append(record){
  // Callers must serialize writes through a single writer; multi-process locking is not supplied.
  if(!record||record.asset!=='NOMNI'||!HEX.test(record.id||''))throw new TypeError('invalid_record');
  const entries=await read();
  if(entries.some(e=>e.record.id===record.id))return {inserted:false,length:entries.length};
  const previous_hash=entries.at(-1)?.entry_hash??'0'.repeat(64);
  const body={sequence:entries.length+1,previous_hash,record};
  const row={...body,entry_hash:hash(JSON.stringify(body))};
  await mkdir(dirname(path),{recursive:true});
  const tmp=path+'.tmp';
  // Atomic replacement in same directory; not a multi-writer transaction.
  const handle=await open(tmp,'wx');
  try{await handle.writeFile([...entries,row].map(v=>JSON.stringify(v)).join('\n')+'\n');await handle.sync()}finally{await handle.close()}
  await rename(tmp,path);
  return {inserted:true,length:entries.length+1};
 }
 return Object.freeze({read,append});
}
