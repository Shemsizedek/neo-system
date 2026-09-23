import {mkdir,readFile,rename,writeFile} from 'node:fs/promises'
import {dirname} from 'node:path'
const blank=()=>({consents:{},credentials:{},sessions:{},audit:[]})
export class FileNeotherapyStore{
 constructor(path=process.env.NEOTHERAPY_DATA_PATH||'./data/neotherapy/store.json'){this.path=path;this.queue=Promise.resolve()}
 async load(){try{return JSON.parse(await readFile(this.path,'utf8'))}catch(e){if(e?.code==='ENOENT')return blank();throw e}}
 async mutate(fn){this.queue=this.queue.then(async()=>{const data=await this.load();const result=await fn(data);await mkdir(dirname(this.path),{recursive:true});const tmp=this.path+'.tmp';await writeFile(tmp,JSON.stringify(data,null,2),{mode:0o600});await rename(tmp,this.path);return result});return this.queue}
 async getConsent(p,m){return (await this.load()).consents[p+':'+m]}
 async saveConsent(r){return this.mutate(d=>{d.consents[r.participantId+':'+r.modalityId]=r})}
 async getCredential(p){return (await this.load()).credentials[p]}
 async saveCredential(r){return this.mutate(d=>{d.credentials[r.practitionerId]=r})}
 async getSession(id){return (await this.load()).sessions[id]}
 async saveSession(r){return this.mutate(d=>{d.sessions[r.id]=r})}
 async appendAudit(e){return this.mutate(d=>{d.audit.push(e)})}
}
