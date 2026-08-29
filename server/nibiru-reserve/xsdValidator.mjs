import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

export function createXmllintValidator({schemaPath,executable='xmllint'}={}){
  if(!schemaPath)throw new Error('schemaPath is required');
  return async({document})=>{const dir=mkdtempSync(join(tmpdir(),'nibiru-xsd-')),xmlPath=join(dir,'message.xml');try{writeFileSync(xmlPath,document,{mode:0o600});const result=spawnSync(executable,['--nonet','--noout','--schema',schemaPath,xmlPath],{encoding:'utf8',shell:false,timeout:15000,maxBuffer:1024*1024});if(result.error)return{valid:false,errors:[result.error.message]};return{valid:result.status===0,errors:result.status===0?[]:[String(result.stderr||result.stdout||`validator exited ${result.status}`).trim()]}}finally{rmSync(dir,{recursive:true,force:true})}};
}
