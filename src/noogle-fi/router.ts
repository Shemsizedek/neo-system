import type {NoogleFiProvider,ProviderState,RouteDecision,RouteRequest} from './types'

const env=((import.meta as ImportMeta & {env?:Record<string,string|undefined>}).env)||{}

export const noogleFiProviders:NoogleFiProvider[]=[
  {id:'sip',name:'SIP / PSTN Provider',capabilities:['voice','ivr'],priority:10,state:env.VITE_NOOGLE_FI_SIP_HEALTH_URL?'READY':'CONFIG_REQUIRED',healthUrl:env.VITE_NOOGLE_FI_SIP_HEALTH_URL,notes:'Credential-gated carrier bridge'},
  {id:'sms',name:'SMS / MMS Provider',capabilities:['sms','mms'],priority:20,state:env.VITE_NOOGLE_FI_SMS_HEALTH_URL?'READY':'CONFIG_REQUIRED',healthUrl:env.VITE_NOOGLE_FI_SMS_HEALTH_URL,notes:'Credential-gated messaging bridge'},
  {id:'webrtc',name:'WebRTC Data Plane',capabilities:['voice','webrtc','data'],priority:30,state:'READY',notes:'Browser/service transport boundary; signaling provider still required for production'},
  {id:'esim',name:'eSIM / Mobile Carrier',capabilities:['esim','data','sms','voice'],priority:40,state:env.VITE_NOOGLE_FI_ESIM_HEALTH_URL?'READY':'CONFIG_REQUIRED',healthUrl:env.VITE_NOOGLE_FI_ESIM_HEALTH_URL,notes:'Provisioning actions disabled in browser'},
  {id:'nvsn',name:'NVSN Software Bridge',capabilities:['nvsn','mesh','data'],priority:50,state:'READY',notes:'Virtual routing integration only; no radio control'}
]

export function routeNoogleFi(request:RouteRequest):RouteDecision{
  const candidates=noogleFiProviders.filter(p=>p.capabilities.includes(request.capability)).sort((a,b)=>a.priority-b.priority)
  const preferred=request.prefer?candidates.find(p=>p.id===request.prefer&&p.state==='READY'):undefined
  const provider=preferred||candidates.find(p=>p.state==='READY')
  return {request,provider,fallbackProviders:candidates.filter(p=>p.id!==provider?.id),mode:provider?'ROUTABLE':'CONFIG_REQUIRED',rationale:provider?`${provider.name} selected by capability/priority policy. Execution remains gated by provider credentials and server-side controls.`:'No READY provider is configured for this capability.'}
}

export async function getNoogleFiHealth():Promise<NoogleFiProvider[]>{
  return Promise.all(noogleFiProviders.map(async provider=>{
    if(!provider.healthUrl)return provider
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),5000)
    try{const response=await fetch(provider.healthUrl,{signal:controller.signal});const state:ProviderState=response.ok?'READY':'DEGRADED';return {...provider,state}}
    catch{const state:ProviderState='OFFLINE';return {...provider,state}}
    finally{clearTimeout(timer)}
  }))
}
