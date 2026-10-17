import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
// Uses system OpenSSH. No passwords or private keys are accepted by this adapter.
export function createSshAdapter({spawnImpl=spawn}={}){
 return Object.freeze({
  execute({hostAlias,command,timeoutMs=15000}){
   if(typeof hostAlias!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,62}$/.test(hostAlias))throw Error('invalid_host_alias');
   if(typeof command!=='string'||!command.trim()||command.length>4096)throw Error('invalid_command');
   if(!Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>60000)throw Error('invalid_timeout');
   return new Promise((resolve,reject)=>{
    let stdout='',stderr='',finished=false;
    const child=spawnImpl('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=8','--',hostAlias,command],{shell:false,stdio:['ignore','pipe','pipe']});
    const done=(err,result)=>{if(finished)return;finished=true;clearTimeout(timer);err?reject(err):resolve(result)};
    const timer=setTimeout(()=>{child.kill('SIGKILL');done(Error('ssh_timeout'))},timeoutMs);
    child.stdout.on('data',buf=>{stdout=(stdout+buf.toString()).slice(0,65536)});
    child.stderr.on('data',buf=>{stderr=(stderr+buf.toString()).slice(0,8192)});
    child.on('error',err=>done(err));
    child.on('close',code=>done(null,{exitCode:code,stdout,stderr}));
   });
  }
 });
}
