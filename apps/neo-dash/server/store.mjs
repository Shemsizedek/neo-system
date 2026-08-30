import { randomUUID } from 'node:crypto';
import { createSqliteStore } from './persistent-store.mjs';

const clone=value=>value==null?value:structuredClone(value);
const stamp=()=>new Date().toISOString();

export function createMemoryStore(){
  const configuredPath=String(process.env.NEO_DASH_DB_PATH||'').trim();
  if(configuredPath) return createSqliteStore(configuredPath);

  const providers=new Map();
  const quotes=new Map();
  const jobs=new Map();
  const vehicles=new Map();
  const merchants=new Map();
  const dispatchOffers=new Map();
  const payments=new Map();
  const auditEvents=[];
  const audit=(entityType,entityId,eventType,payload={})=>auditEvents.push({id:randomUUID(),entityType,entityId,eventType,payload:clone(payload),createdAt:stamp()});

  return {
    createProviderApplication(input={}){const id=randomUUID();const now=stamp();const provider={id,accountId:String(input.accountId||''),requestedRoles:Array.isArray(input.requestedRoles)?[...new Set(input.requestedRoles)]:[],roles:[],authorities:{},status:'PENDING',suspended:false,activeExclusiveJobId:null,createdAt:now,updatedAt:now};providers.set(id,provider);audit('provider',id,'PROVIDER_APPLICATION_CREATED',{accountId:provider.accountId});return clone(provider);},
    getProvider(id){return clone(providers.get(id)||null);},
    approveProvider(id,{roles=[],authorities={}}={}){const provider=providers.get(id);if(!provider)return null;provider.roles=[...new Set(roles)];provider.authorities={...authorities};provider.status='APPROVED';provider.updatedAt=stamp();audit('provider',id,'PROVIDER_APPROVED',{roles:provider.roles});return clone(provider);},
    listProviders(){return [...providers.values()].map(clone);},
    saveProvider(provider){provider.updatedAt=stamp();providers.set(provider.id,clone(provider));audit('provider',provider.id,'PROVIDER_UPDATED',{status:provider.status});return clone(provider);},
    createQuote(quote){const id=randomUUID();const value={id,...quote,createdAt:stamp()};quotes.set(id,value);audit('quote',id,'QUOTE_CREATED',{customerId:value.customerId});return clone(value);},
    getQuote(id){return clone(quotes.get(id)||null);},
    createJob(input){const id=randomUUID();const now=stamp();const value={id,providerId:null,checkoutId:null,state:'QUOTED',createdAt:now,updatedAt:now,...input};jobs.set(id,value);audit('job',id,'JOB_CREATED',{state:value.state});return clone(value);},
    getJob(id){return clone(jobs.get(id)||null);},
    saveJob(job){job.updatedAt=stamp();jobs.set(job.id,clone(job));audit('job',job.id,'JOB_UPDATED',{state:job.state,providerId:job.providerId||null});return clone(job);},
    listJobs(){return [...jobs.values()].map(clone);},
    createVehicle(input={}){const id=randomUUID();const now=stamp();const value={id,status:'PENDING',...input,providerId:String(input.providerId||''),createdAt:now,updatedAt:now};vehicles.set(id,value);audit('vehicle',id,'VEHICLE_CREATED',{providerId:value.providerId});return clone(value);},
    getVehicle(id){return clone(vehicles.get(id)||null);},
    listVehicles(providerId){return [...vehicles.values()].filter(v=>!providerId||v.providerId===providerId).map(clone);},
    createMerchant(input={}){const id=randomUUID();const now=stamp();const value={id,status:'PENDING',...input,accountId:String(input.accountId||''),createdAt:now,updatedAt:now};merchants.set(id,value);audit('merchant',id,'MERCHANT_CREATED',{accountId:value.accountId});return clone(value);},
    getMerchant(id){return clone(merchants.get(id)||null);},
    listMerchants(accountId){return [...merchants.values()].filter(m=>!accountId||m.accountId===accountId).map(clone);},
    createDispatchOffer(input={}){const id=randomUUID();const now=stamp();const value={id,state:'OFFERED',...input,createdAt:now,updatedAt:now};dispatchOffers.set(id,value);audit('dispatch_offer',id,'DISPATCH_OFFER_CREATED',{jobId:value.jobId,providerId:value.providerId});return clone(value);},
    getDispatchOffer(id){return clone(dispatchOffers.get(id)||null);},
    listDispatchOffers({jobId,providerId}={}){return [...dispatchOffers.values()].filter(o=>(!jobId||o.jobId===jobId)&&(!providerId||o.providerId===providerId)).map(clone);},
    recordPayment(input={}){const id=randomUUID();const now=stamp();const value={id,state:'PENDING',...input,createdAt:now,updatedAt:now};payments.set(id,value);audit('payment',id,'PAYMENT_RECORDED',{jobId:value.jobId,state:value.state});return clone(value);},
    getPayment(id){return clone(payments.get(id)||null);},
    listPayments(jobId){return [...payments.values()].filter(p=>!jobId||p.jobId===jobId).map(clone);},
    listAuditEvents(entityType,entityId){return auditEvents.filter(e=>(!entityType||e.entityType===entityType)&&(!entityId||e.entityId===entityId)).map(clone);}
  };
}
