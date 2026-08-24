import type {HashpowerAllocation} from './types'
import type {ShareAttribution,SettlementBatch} from './aggregator'

export type GatewayMode='DISABLED'|'SIMULATION'|'LIVE'
export type GatewayStatus='DISCONNECTED'|'CONNECTING'|'CONNECTED'|'DEGRADED'|'ERROR'

export interface MinerAgentEndpoint {
  id:string
  minerId:string
  baseUrl:string
  publicKeyId:string
  status:GatewayStatus
  lastSeenAt:string|null
  tlsRequired:boolean
  enabled:boolean
}

export interface PoolGatewayConfig {
  id:string
  poolName:string
  protocol:'STRATUM_V1'|'STRATUM_V2'
  endpoint:string
  status:GatewayStatus
  enabled:boolean
}

export interface ShareEvent {
  id:string
  allocationId:string
  minerId:string
  workerId:string
  accepted:boolean
  difficultyUnits:number
  receivedAt:string
  source:'MINER_AGENT'|'POOL_GATEWAY'
  verified:boolean
}

export interface PoolPayoutEvent {
  id:string
  poolId:string
  txid:string
  grossBtc:number
  feeBtc:number
  receivedAt:string
  confirmations:number
  verified:boolean
}

export interface LiveGatewaySnapshot {
  mode:GatewayMode
  minerAgents:number
  connectedAgents:number
  poolGateways:number
  connectedPools:number
  verifiedShares:number
  unverifiedShares:number
  verifiedPayouts:number
  settlementReady:boolean
}

export const defaultGatewayMode:GatewayMode='DISABLED'

export const seedMinerAgents:MinerAgentEndpoint[]=[
  {id:'MAG-TX-001',minerId:'NEO-MINER-TX-000001',baseUrl:'https://miner-agent.invalid/tx-001',publicKeyId:'neo-agent-demo-tx-001',status:'DISCONNECTED',lastSeenAt:null,tlsRequired:true,enabled:false},
  {id:'MAG-TX-002',minerId:'NEO-MINER-TX-000002',baseUrl:'https://miner-agent.invalid/tx-002',publicKeyId:'neo-agent-demo-tx-002',status:'DISCONNECTED',lastSeenAt:null,tlsRequired:true,enabled:false}
]

export const seedPoolGateways:PoolGatewayConfig[]=[
  {id:'PGW-NEO-PRIMARY',poolName:'NEO Pool Primary',protocol:'STRATUM_V2',endpoint:'stratum2+noise://pool.invalid:3336',status:'DISCONNECTED',enabled:false}
]

export function validateGatewayMode(mode:GatewayMode,agents:MinerAgentEndpoint[],pools:PoolGatewayConfig[]){
  if(mode!=='LIVE') return {ready:false,reason:mode==='DISABLED'?'Live gateway disabled':'Simulation mode'}
  const enabledAgents=agents.filter(a=>a.enabled)
  const enabledPools=pools.filter(p=>p.enabled)
  if(!enabledAgents.length) return {ready:false,reason:'No enabled miner agents'}
  if(!enabledPools.length) return {ready:false,reason:'No enabled pool gateway'}
  if(enabledAgents.some(a=>!a.tlsRequired)) return {ready:false,reason:'TLS is required for every live miner agent'}
  return {ready:true,reason:'Live gateway configuration passed structural checks'}
}

export function ingestShareEvent(event:ShareEvent,allocation:HashpowerAllocation,mode:GatewayMode){
  if(mode!=='LIVE') return {...event,verified:false}
  if(event.allocationId!==allocation.id) return {...event,verified:false}
  if(!allocation.sourceMinerIds.includes(event.minerId)) return {...event,verified:false}
  if(event.difficultyUnits<=0) return {...event,verified:false}
  return event
}

export function shareEventsToAttribution(contractId:string,allocationId:string,events:ShareEvent[],poolDifficultyUnits:number,payoutGrossBtc:number,mode:GatewayMode):ShareAttribution{
  const rows=events.filter(e=>e.allocationId===allocationId)
  const accepted=rows.filter(e=>e.accepted).length
  const rejected=rows.filter(e=>!e.accepted).length
  const difficulty=rows.filter(e=>e.accepted).reduce((s,e)=>s+e.difficultyUnits,0)
  const ratio=poolDifficultyUnits>0?difficulty/poolDifficultyUnits:0
  const now=new Date()
  return {
    id:`SHA-LIVE-${Date.now()}`,
    contractId,
    allocationId,
    acceptedShares:accepted,
    rejectedShares:rejected,
    difficultyUnits:difficulty,
    attributedBtc:Math.max(0,payoutGrossBtc*ratio),
    periodStart:new Date(now.getTime()-60*60_000).toISOString(),
    periodEnd:now.toISOString(),
    status:mode==='LIVE'&&rows.length>0&&rows.every(e=>e.verified)?'VERIFIED':'ESTIMATED'
  }
}

export function reconcilePayout(batch:SettlementBatch,payout:PoolPayoutEvent,mode:GatewayMode){
  const chainVerified=mode==='LIVE'&&payout.verified&&payout.confirmations>=1&&payout.txid.length>=32
  const coversBatch=payout.grossBtc>=batch.grossBtc
  return {
    batchId:batch.id,
    payoutId:payout.id,
    chainVerified,
    coversBatch,
    reconciliationStatus:chainVerified&&coversBatch?'MATCHED':'BLOCKED' as 'MATCHED'|'BLOCKED',
    reason:!chainVerified?'Payout is not verified on the live path':!coversBatch?'Pool payout does not cover settlement batch':'Verified payout covers batch'
  }
}

export function gatewaySnapshot(mode:GatewayMode,agents:MinerAgentEndpoint[],pools:PoolGatewayConfig[],shares:ShareEvent[],payouts:PoolPayoutEvent[]=[]):LiveGatewaySnapshot{
  const connectedAgents=agents.filter(a=>a.enabled&&a.status==='CONNECTED').length
  const connectedPools=pools.filter(p=>p.enabled&&p.status==='CONNECTED').length
  const verifiedShares=shares.filter(s=>s.verified).length
  const unverifiedShares=shares.length-verifiedShares
  const verifiedPayouts=payouts.filter(p=>p.verified&&p.confirmations>=1).length
  return {mode,minerAgents:agents.length,connectedAgents,poolGateways:pools.length,connectedPools,verifiedShares,unverifiedShares,verifiedPayouts,settlementReady:mode==='LIVE'&&connectedAgents>0&&connectedPools>0&&verifiedShares>0&&verifiedPayouts>0}
}
