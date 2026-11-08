#!/usr/bin/env node
import { open,writeFile,rename,mkdir,lstat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname,resolve } from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { validateConfig,checkCycle } from './core.mjs';

export async function run({configPath,stateDir,once=false,signal}){
 if(!configPath||!stateDir)throw Error('Use --config and --state-dir with owner-approved local paths');
 await mkdir(stateDir,{recursive:true,mode:0o700});const stat=await lstat(stateDir);if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('State directory must be a real directory');
 while(!signal.aborted){
  // Re-read each cycle: disabling or withdrawing authorization stops new checks.
  const metadata=await lstat(configPath);if(!metadata.isFile()||metadata.isSymbolicLink()||metadata.size>65536)throw Error('Invalid enrollment file');
  const file=await open(configPath,constants.O_RDONLY|constants.O_NOFOLLOW);let text;try{const before=await file.stat();if(!before.isFile()||before.ino!==metadata.ino||before.dev!==metadata.dev||before.size>65536)throw Error('Enrollment file changed');const buffer=Buffer.alloc(65537);const {bytesRead}=await file.read(buffer,0,buffer.length,0);const after=await file.stat();if(bytesRead>65536||after.size!==before.size||after.mtimeMs!==before.mtimeMs||after.ctimeMs!==before.ctimeMs)throw Error('Enrollment file changed');text=buffer.toString('utf8',0,bytesRead);}finally{await file.close();}const config=validateConfig(JSON.parse(text));
  const result=await checkCycle(config,{root:dirname(fileURLToPath(import.meta.url)),signal});
  const reportText=JSON.stringify(result);const temporary=resolve(stateDir,'.report-'+randomUUID());await writeFile(temporary,reportText+'\n',{mode:0o600,flag:'wx'});await rename(temporary,resolve(stateDir,'latest.json'));process.stdout.write(reportText+'\n');
  if(once||signal.aborted)return result;
  try{await delay(config.intervalSeconds*1000,undefined,{signal});}catch(error){if(error.name!=='AbortError')throw error;}
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2),options={once:false};
 try{for(let i=0;i<args.length;i++){const k=args[i];if(k==='--once')options.once=true;else if(k==='--config'||k==='--state-dir'){if(!args[i+1]||args[i+1].startsWith('--'))throw Error('Missing option value');options[k==='--config'?'configPath':'stateDir']=resolve(args[++i]);}else throw Error('Unknown option');}
 const controller=new AbortController();const stop=()=>controller.abort();process.once('SIGTERM',stop);process.once('SIGINT',stop);await run({...options,signal:controller.signal});process.stdout.write(JSON.stringify({agent:'NEO Angel',state:'stopped'})+'\n');
 }catch{process.stderr.write('NEO Angel stopped: enrollment, configuration or local storage could not be verified. No configuration contents are logged.\n');process.exitCode=1;}
}
