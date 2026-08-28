export type NoogleFiCapability='voice'|'sms'|'mms'|'ivr'|'webrtc'|'esim'|'data'|'nvsn'|'mesh'
export type ProviderState='READY'|'DEGRADED'|'CONFIG_REQUIRED'|'OFFLINE'

export interface NoogleFiProvider{
  id:string
  name:string
  capabilities:NoogleFiCapability[]
  priority:number
  state:ProviderState
  healthUrl?:string
  region?:string
  notes:string
}

export interface RouteRequest{
  capability:NoogleFiCapability
  destination:string
  region?:string
  prefer?:string
}

export interface RouteDecision{
  request:RouteRequest
  provider?:NoogleFiProvider
  fallbackProviders:NoogleFiProvider[]
  mode:'ROUTABLE'|'CONFIG_REQUIRED'
  rationale:string
}
