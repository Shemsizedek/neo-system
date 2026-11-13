import { createHash } from 'node:crypto';
import { open, lstat, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';

export const TARGETS=Object.freeze({
 school:'https://school.holytemples.org/',
 neopass:'https://neopass.holytemples.org/',
 prime:'https://prime.holytemples.org/healthz',
 temple:'https://holytemples.org/',
 noogle:'https://noogle.holytemples.org/',
});
const ALLOWED_FILES=new Set(['angelN.mjs','core.mjs']);
const keys=(o,allowed)=>{if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!allowed.includes(k)))throw Error('Invalid configuration shape');};
export function validateConfig(value){
 keys(value,['version','deviceId','operator','authorized','enabled','intervalSeconds','timeoutMs','targets','integrity']);
 if(value.version!==1||!/^[-a-zA-Z0-9_]{3,80}$/.test(value.deviceId??'')||typeof value.operator!=='string'||!value.operator.trim()||value.operator.length>100)throw Error('Enrollment identity is required');
 if(value.authorized!==true)throw Error('Explicit owner enrollment is required before operation');
 if(typeof value.enabled!=='boolean'||!Number.isInteger(value.intervalSeconds)||value.intervalSeconds<60||value.intervalSeconds>3600||!Number.isInteger(value.timeoutMs)||value.timeoutMs<1000||value.timeoutMs>10000)throw Error('Invalid monitoring limits');
 if(!Array.isArray(value.targets)||value.targets.length>5||new Set(value.targets).size!==value.targets.length||value.targets.some(t=>!Object.hasOwn(TARGETS,t)))throw Error('Only named NEO targets are permitted');
 keys(value.integrity,['files']);keys(value.integrity.files,[...ALLOWED_FILES]);
 if(Object.values(value.integrity.files).some(h=>typeof h!=='string'||!/^\b[a-f0-9]{64}\b$/.test(h)))throw Error('Integrity baselines must be pinned SHA-256 digests');
 return structuredClone(value);
}
export async function fileCheck(root,name,expected){
 if(!ALLOWED_FILES.has(name)||isAbsolute(name)||relative(root,resolve(root,name)).startsWith('..'))throw Error('File outside enrolled program scope');
 let handle;try{const rootReal=await realpath(root);const path=resolve(rootReal,name);const info=await lstat(path);if(!info.isFile()||info.isSymbolicLink()||info.size>8*1024*1024)throw Error('Unapproved file type or size');if(await realpath(path)!==path)throw Error('Symlink rejected');handle=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);const before=await handle.stat({bigint:true});if(before.ino!==BigInt(info.ino)||before.dev!==BigInt(info.dev)||!before.isFile()||before.size>8n*1024n*1024n)throw Error('File changed before inspection');const hash=createHash('sha256');for await(const part of handle.createReadStream({autoClose:false}))hash.update(part);const after=await handle.stat({bigint:true});if(before.size!==after.size||before.mtimeNs!==after.mtimeNs||before.ctimeNs!==after.ctimeNs)throw Error('File changed during inspection');return {id:name,kind:'file-integrity',outcome:hash.digest('hex')===expected?'baseline_match':'baseline_mismatch',confidence:'observation',malwareVerdict:'not-performed'};}catch{return {id:name,kind:'file-integrity',outcome:'unverified',confidence:'unknown',malwareVerdict:'not-performed'};}finally{await handle?.close();}
}
export async function endpointCheck(id,timeoutMs,signal,fetcher=fetch){
 if(!Object.hasOwn(TARGETS,id))throw Error('Unenrolled target');
 try{const r=await fetcher(TARGETS[id],{method:'GET',redirect:'manual',signal:AbortSignal.any([AbortSignal.timeout(timeoutMs),signal??new AbortController().signal]),headers:{Accept:id==='prime'?'application/json':'text/html'}});const outcome=r.status>=300&&r.status<400?'redirect_not_followed':r.ok?'http_reachable':'http_unavailable';await r.body?.cancel();return {id,kind:'https',status:r.status,outcome,confidence:'observation',applicationHealth:'unverified'};}catch{return {id,kind:'https',status:null,outcome:signal?.aborted?'cancelled':'check_failed',confidence:'unknown',applicationHealth:'unverified'};}
}
export async function checkCycle(config,{root,signal,fetcher=fetch,now=()=>new Date().toISOString()}={}){
 const c=validateConfig(config);if(!c.enabled)return {schema:1,agent:'NEO Angel',service:'neo-angelN',deviceId:c.deviceId,at:now(),state:'paused',checks:[],malwareScan:'not-performed'};
 const checks=[];for(const id of c.targets){if(signal?.aborted)break;checks.push(await endpointCheck(id,c.timeoutMs,signal,fetcher));}
 for(const [name,digest]of Object.entries(c.integrity.files)){if(signal?.aborted)break;checks.push(await fileCheck(root,name,digest));}
 return {schema:1,agent:'NEO Angel',service:'neo-angelN',deviceId:c.deviceId,at:now(),state:signal?.aborted?'stopping':'observing',checks,integrityConfigured:Object.keys(c.integrity.files).length>0,malwareScan:'not-performed',remediation:'not-executed'};
}
