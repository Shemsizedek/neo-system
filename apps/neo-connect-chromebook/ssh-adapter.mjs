import {spawn} from 'node:child_process';

// Uses system OpenSSH and the Chromebook user's existing config, agent and keys.
// No passwords, private keys, shell interpolation, or automatic host trust.
export function validateSshRequest({hostAlias,username,port,command,timeoutMs=15000}) {
  if(typeof hostAlias!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,252}$/.test(hostAlias))throw Error('invalid_host_alias');
  if(username!==undefined&&(typeof username!=='string'||!/^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,63}$/.test(username)))throw Error('invalid_username');
  if(port!==undefined&&(!Number.isInteger(port)||port<1||port>65535))throw Error('invalid_port');
  if(typeof command!=='string'||!command.trim()||command.length>4096)throw Error('invalid_command');
  if(!Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>60000)throw Error('invalid_timeout');
}

export function createSshAdapter({spawnImpl=spawn}={}) {
  return Object.freeze({
    execute({hostAlias,username,port,command,timeoutMs=15000}) {
      validateSshRequest({hostAlias,username,port,command,timeoutMs});
      return new Promise((resolve,reject)=>{
        let stdout='',stderr='',finished=false,timer;
        const args=['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=8',
          '-o','ForwardAgent=no','-o','ClearAllForwardings=yes','-o','RequestTTY=no'];
        if(username!==undefined)args.push('-l',username);
        if(port!==undefined)args.push('-p',String(port));
        args.push('--',hostAlias,command);
        const child=spawnImpl('ssh',args,{shell:false,stdio:['ignore','pipe','pipe']});
        const done=(err,result)=>{
          if(finished)return;
          finished=true;
          clearTimeout(timer);
          err?reject(err):resolve(result);
        };
        timer=setTimeout(()=>{child.kill('SIGKILL');done(Error('ssh_timeout'));},timeoutMs);
        child.stdout.on('data',buf=>{stdout=(stdout+buf.toString()).slice(0,65536);});
        child.stderr.on('data',buf=>{stderr=(stderr+buf.toString()).slice(0,65536);});
        child.on('error',err=>done(err));
        child.on('close',code=>done(null,{exitCode:Number.isInteger(code)?code:1,stdout,stderr}));
      });
    }
  });
}
