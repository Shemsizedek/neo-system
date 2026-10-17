import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
// In-memory, one-time local terminal approval boundary. This is not a NEO Pass
// verifier: an authenticated NEO Pass adapter must authorize the approve call.
export function createTerminalApproval({now=()=>Date.now(),ttlMs=120000}={}){
 const pending=new Map();
 const digest=v=>createHash('sha256').update(v).digest();
 return Object.freeze({
  request({subject,device,command}){
   if(!subject||!device||typeof command!=='string'||!command.trim()||command.length>4096)throw Error('invalid_request');
   const id=randomBytes(16).toString('hex'),secret=randomBytes(32).toString('hex');
   pending.set(id,{subject,device,command,hash:digest(secret),expires:now()+ttlMs,approved:false});
   return {id,secret,device,command,expiresAt:now()+ttlMs};
  },
  approve({id,subject,device}){
   const p=pending.get(id);
   if(!p||p.expires<=now()||p.subject!==subject||p.device!==device)throw Error('approval_denied');
   p.approved=true;return {approved:true,device:p.device,command:p.command};
  },
  consume({id,secret,subject,device,command}){
   const p=pending.get(id);
   if(!p||!p.approved||p.expires<=now()||p.subject!==subject||p.device!==device||p.command!==command||
       typeof secret!=='string'||secret.length!==64||
       !timingSafeEqual(p.hash,digest(secret)))throw Error('session_not_authorized');
   pending.delete(id);
   return {subject:p.subject,device:p.device,command:p.command};
  },
  revoke(id){return pending.delete(id)}
 });
}
