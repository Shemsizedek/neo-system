import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createNomniEvidenceJournal} from './nomni-evidence-journal.mjs';
test('journal survives reopen and rejects tampering',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nomni-journal-'));const path=join(dir,'audit.ndjson');
 try{const j=createNomniEvidenceJournal({path});const rec={asset:'NOMNI',id:'a'.repeat(64),status:'unverified'};
  assert.equal((await j.append(rec)).inserted,true);assert.equal((await j.append(rec)).inserted,false);
  assert.equal((await createNomniEvidenceJournal({path}).read()).length,1);
  await writeFile(path,(await readFile(path,'utf8')).replace('unverified','verified'));
  await assert.rejects(()=>j.read(),/journal_integrity_error/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
