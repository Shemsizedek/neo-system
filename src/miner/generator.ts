import type {DigitalMinerProduct, HashpowerAllocation, Miner} from './types'

export const digitalMinerProducts: DigitalMinerProduct[] = [
  {id:'NDM-SPARK-025',name:'NEO Digital Miner — Spark',tier:'SPARK',allocatedHashrateTh:25,referenceEfficiencyJTh:18,termMonths:3,basePriceUsd:360,serviceFeePct:8,backingMode:'REAL_HASHRATE_REQUIRED',status:'AVAILABLE'},
  {id:'NDM-CORE-100',name:'NEO Digital Miner — Core',tier:'CORE',allocatedHashrateTh:100,referenceEfficiencyJTh:16,termMonths:6,basePriceUsd:2400,serviceFeePct:7,backingMode:'REAL_HASHRATE_REQUIRED',status:'AVAILABLE'},
  {id:'NDM-TITAN-500',name:'NEO Digital Miner — Titan',tier:'TITAN',allocatedHashrateTh:500,referenceEfficiencyJTh:14,termMonths:12,basePriceUsd:18000,serviceFeePct:6,backingMode:'REAL_HASHRATE_REQUIRED',status:'AVAILABLE'},
  {id:'NDM-SOV-1000',name:'NEO Digital Miner — Sovereign',tier:'SOVEREIGN',allocatedHashrateTh:1000,referenceEfficiencyJTh:12,termMonths:12,basePriceUsd:33000,serviceFeePct:5,backingMode:'REAL_HASHRATE_REQUIRED',status:'WAITLIST'}
]

export const seedAllocations: HashpowerAllocation[] = [
  {id:'HPA-260823-001',digitalMinerId:'NDM-TITAN-500',contractId:'NMC-260819-001',customer:'Demo Enterprise A',targetHashrateTh:500,deliveredHashrateTh:501.2,sourceMinerIds:['NEO-MINER-TX-000001','NEO-MINER-TX-000002','NEO-MINER-TX-000003','NEO-MINER-GA-000006'],pool:'NEO Pool Primary',protocol:'STRATUM_V2',status:'MINING',simulation:true}
]

export interface GeneratorSnapshot {
  physicalHashrateTh: number
  allocatedHashrateTh: number
  availableHashrateTh: number
  utilizationPct: number
  estimatedPowerKw: number
}

export function generatorSnapshot(miners: Miner[], allocations: HashpowerAllocation[]): GeneratorSnapshot {
  const physicalHashrateTh = miners.filter(m=>m.status==='MINING'||m.status==='WARNING').reduce((sum,m)=>sum+m.hashrateTh,0)
  const allocatedHashrateTh = allocations.filter(a=>['ALLOCATED','MINING','DEGRADED'].includes(a.status)).reduce((sum,a)=>sum+a.targetHashrateTh,0)
  const availableHashrateTh = Math.max(0, physicalHashrateTh-allocatedHashrateTh)
  const utilizationPct = physicalHashrateTh ? Math.min(100,(allocatedHashrateTh/physicalHashrateTh)*100) : 0
  const estimatedPowerKw = miners.reduce((sum,m)=>sum+m.powerW,0)/1000
  return {physicalHashrateTh,allocatedHashrateTh,availableHashrateTh,utilizationPct,estimatedPowerKw}
}

export function canBackProduct(product: DigitalMinerProduct, snapshot: GeneratorSnapshot): boolean {
  return product.backingMode==='SIMULATION_ONLY' || snapshot.availableHashrateTh >= product.allocatedHashrateTh
}

export function quoteDigitalMiner(product: DigitalMinerProduct, paymentCurrency: string) {
  const serviceFee = product.basePriceUsd*(product.serviceFeePct/100)
  const totalUsd = product.basePriceUsd+serviceFee
  return {
    productId: product.id,
    paymentCurrency,
    baseUsd: product.basePriceUsd,
    serviceFeeUsd: serviceFee,
    totalUsd,
    estimatedBtc: null as number|null,
    disclaimer:'Hashrate allocation is a service contract. BTC production depends on network difficulty, pool performance, uptime, fees, and actual delivered hashrate; no return is guaranteed.'
  }
}
