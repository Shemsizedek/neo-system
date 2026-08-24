import type {HashpowerAllocation, Miner} from './types'

export interface MinerContribution {
  minerId:string
  availableHashrateTh:number
  assignedHashrateTh:number
  healthScore:number
  status:'ASSIGNED'|'STANDBY'|'FAILED'
}

export interface AggregationPlan {
  id:string
  contractId:string
  targetHashrateTh:number
  assignedHashrateTh:number
  reserveHashrateTh:number
  contributions:MinerContribution[]
  slaTargetPct:number
  state:'READY'|'PARTIAL'|'INSUFFICIENT_CAPACITY'
}

export interface ShareAttribution {
  id:string
  contractId:string
  allocationId:string
  acceptedShares:number
  rejectedShares:number
  difficultyUnits:number
  attributedBtc:number
  periodStart:string
  periodEnd:string
  status:'ESTIMATED'|'VERIFIED'
}

export interface RebalanceEvent {
  id:string
  allocationId:string
  failedMinerId:string
  replacementMinerId:string|null
  shiftedHashrateTh:number
  reason:string
  occurredAt:string
  status:'COMPLETED'|'CAPACITY_SHORTFALL'
}

export interface SettlementBatch {
  id:string
  contractId:string
  grossBtc:number
  poolFeeBtc:number
  serviceFeeBtc:number
  netBtc:number
  destinationLedger:'HASHVAULT_CUSTOMER'|'HASHVAULT_TREASURY'
  status:'DRAFT'|'APPROVED'|'SETTLED'
  sourceAttributionIds:string[]
  simulation:boolean
}

const eligible=(m:Miner)=>m.status==='MINING'||m.status==='WARNING'
const health=(m:Miner)=>Math.max(0,Math.min(100,m.uptimePct-(m.tempC>75?8:0)-(m.status==='WARNING'?5:0)))

export function buildAggregationPlan(contractId:string,targetHashrateTh:number,miners:Miner[],slaTargetPct=98,reservePct=5):AggregationPlan{
  const reserveTarget=targetHashrateTh*(reservePct/100)
  let remaining=targetHashrateTh
  let reserveRemaining=reserveTarget
  const ranked=miners.filter(eligible).sort((a,b)=>health(b)-health(a)||b.hashrateTh-a.hashrateTh)
  const contributions:MinerContribution[]=[]
  for(const miner of ranked){
    const assign=Math.min(remaining,miner.hashrateTh)
    remaining-=assign
    const leftover=Math.max(0,miner.hashrateTh-assign)
    const reserveAssign=Math.min(reserveRemaining,leftover)
    reserveRemaining-=reserveAssign
    contributions.push({minerId:miner.id,availableHashrateTh:miner.hashrateTh,assignedHashrateTh:assign,healthScore:health(miner),status:assign>0?'ASSIGNED':'STANDBY'})
  }
  const assignedHashrateTh=Math.max(0,targetHashrateTh-remaining)
  const reserveHashrateTh=Math.max(0,reserveTarget-reserveRemaining)
  const state=assignedHashrateTh>=targetHashrateTh?(reserveHashrateTh>=reserveTarget?'READY':'PARTIAL'):'INSUFFICIENT_CAPACITY'
  return{id:`AGG-${contractId}`,contractId,targetHashrateTh,assignedHashrateTh,reserveHashrateTh,contributions,slaTargetPct,state}
}

export function deliverySlaPct(targetHashrateTh:number,deliveredHashrateTh:number){
  if(targetHashrateTh<=0)return 0
  return Math.max(0,Math.min(100,(deliveredHashrateTh/targetHashrateTh)*100))
}

export function rebalanceAllocation(allocation:HashpowerAllocation,failedMinerId:string,miners:Miner[]):RebalanceEvent{
  const failed=miners.find(m=>m.id===failedMinerId)
  const needed=failed?.hashrateTh||0
  const inUse=new Set(allocation.sourceMinerIds)
  const replacement=miners.filter(m=>eligible(m)&&!inUse.has(m.id)).sort((a,b)=>health(b)-health(a))[0]
  return {
    id:`RBE-${Date.now()}`,
    allocationId:allocation.id,
    failedMinerId,
    replacementMinerId:replacement?.id||null,
    shiftedHashrateTh:replacement?Math.min(needed,replacement.hashrateTh):0,
    reason:'Miner unavailable or below delivery threshold',
    occurredAt:new Date().toISOString(),
    status:replacement?'COMPLETED':'CAPACITY_SHORTFALL'
  }
}

export function attributeVerifiedShares(contractId:string,allocationId:string,acceptedShares:number,rejectedShares:number,difficultyUnits:number,totalPoolDifficultyUnits:number,totalPoolBtc:number,verified=false):ShareAttribution{
  const ratio=totalPoolDifficultyUnits>0?difficultyUnits/totalPoolDifficultyUnits:0
  const now=new Date()
  const start=new Date(now.getTime()-60*60_000)
  return{id:`SHA-${Date.now()}`,contractId,allocationId,acceptedShares,rejectedShares,difficultyUnits,attributedBtc:Math.max(0,totalPoolBtc*ratio),periodStart:start.toISOString(),periodEnd:now.toISOString(),status:verified?'VERIFIED':'ESTIMATED'}
}

export function createSettlementBatch(contractId:string,attributions:ShareAttribution[],poolFeePct=2,serviceFeePct=5,simulation=true):SettlementBatch{
  const eligibleRows=attributions.filter(a=>a.contractId===contractId)
  const grossBtc=eligibleRows.reduce((s,a)=>s+a.attributedBtc,0)
  const poolFeeBtc=grossBtc*(poolFeePct/100)
  const afterPool=grossBtc-poolFeeBtc
  const serviceFeeBtc=afterPool*(serviceFeePct/100)
  const netBtc=Math.max(0,afterPool-serviceFeeBtc)
  return{id:`SET-${Date.now()}`,contractId,grossBtc,poolFeeBtc,serviceFeeBtc,netBtc,destinationLedger:'HASHVAULT_CUSTOMER',status:'DRAFT',sourceAttributionIds:eligibleRows.map(a=>a.id),simulation}
}

export function settlementIsEligible(batch:SettlementBatch,attributions:ShareAttribution[]){
  const source=new Set(batch.sourceAttributionIds)
  const rows=attributions.filter(a=>source.has(a.id))
  return rows.length>0&&rows.every(a=>a.status==='VERIFIED')&&!batch.simulation
}
