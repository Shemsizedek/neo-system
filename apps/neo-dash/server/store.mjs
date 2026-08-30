import { randomUUID } from 'node:crypto';
import { createSqliteStore } from './persistent-store.mjs';

export function createMemoryStore(){
  const configuredPath=String(process.env.NEO_DASH_DB_PATH||'').trim();
  if(configuredPath) return createSqliteStore(configuredPath);

  const providers=new Map();
  const quotes=new Map();
  const jobs=new Map();

  return {
    createProviderApplication(input={}){
      const id=randomUUID();
      const provider={
        id,
        accountId:String(input.accountId||''),
        requestedRoles:Array.isArray(input.requestedRoles)?[...new Set(input.requestedRoles)]:[],
        roles:[],
        authorities:{},
        status:'PENDING',
        suspended:false,
        activeExclusiveJobId:null,
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString()
      };
      providers.set(id,provider);
      return structuredClone(provider);
    },
    getProvider(id){const value=providers.get(id);return value?structuredClone(value):null;},
    approveProvider(id,{roles=[],authorities={}}={}){
      const provider=providers.get(id);
      if(!provider) return null;
      provider.roles=[...new Set(roles)];
      provider.authorities={...authorities};
      provider.status='APPROVED';
      provider.updatedAt=new Date().toISOString();
      return structuredClone(provider);
    },
    listProviders(){return [...providers.values()].map(value=>structuredClone(value));},
    saveProvider(provider){providers.set(provider.id,structuredClone(provider));return structuredClone(provider);},
    createQuote(quote){
      const id=randomUUID();
      const value={id,...quote,createdAt:new Date().toISOString()};
      quotes.set(id,value);
      return structuredClone(value);
    },
    getQuote(id){const value=quotes.get(id);return value?structuredClone(value):null;},
    createJob(input){
      const id=randomUUID();
      const now=new Date().toISOString();
      const value={id,providerId:null,checkoutId:null,state:'QUOTED',createdAt:now,updatedAt:now,...input};
      jobs.set(id,value);
      return structuredClone(value);
    },
    getJob(id){const value=jobs.get(id);return value?structuredClone(value):null;},
    saveJob(job){job.updatedAt=new Date().toISOString();jobs.set(job.id,structuredClone(job));return structuredClone(job);},
    listJobs(){return [...jobs.values()].map(value=>structuredClone(value));}
  };
}
