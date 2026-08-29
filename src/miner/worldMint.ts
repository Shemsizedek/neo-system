export type VerificationStatus = 'SIMULATED' | 'UNVERIFIED' | 'VERIFIED'
export type MiningAccountKind = 'TREASURY' | 'ORANGE_CHIP_RESERVE' | 'OPERATIONS' | 'CONTRACT_HOLDER'

export interface MiningAccount {
  id: string
  name: string
  kind: MiningAccountKind
  settlementAsset: 'BTC' | 'WORLD_CURRENCY' | 'XCP'
  btcAddress?: string
  status: 'ACTIVE' | 'PENDING' | 'DISABLED'
}

export interface ProductionAllocationRule {
  id: string
  treasuryPct: number
  orangeChipPct: number
  contractHolderPct: number
  effectiveFrom: string
  status: 'ACTIVE' | 'INACTIVE'
}

export interface MiningProductionRecord {
  id: string
  minerId: string
  periodStart: string
  periodEnd: string
  grossBtc: number
  poolFeesBtc: number
  operatingCostBtc: number
  netBtc: number
  treasuryBtc: number
  orangeChipBtc: number
  contractHolderBtc: number
  verificationStatus: VerificationStatus
  txid?: string
  blockHeight?: number
  confirmations?: number
}

export const WORLD_MINT_GENESIS_MINER_ID = 'NEOMINER-WM-0001'

export const worldMintAccounts: MiningAccount[] = [
  {id:'WM-TREASURY-001',name:'World Mint Treasury Mining Account',kind:'TREASURY',settlementAsset:'BTC',status:'ACTIVE'},
  {id:'WM-ORANGE-001',name:'Orange Chip Mining Reserve Account',kind:'ORANGE_CHIP_RESERVE',settlementAsset:'BTC',status:'ACTIVE'},
  {id:'WM-OPS-001',name:'NEO Miner Operations Account',kind:'OPERATIONS',settlementAsset:'WORLD_CURRENCY',status:'ACTIVE'}
]

export const activeAllocationRule: ProductionAllocationRule = {
  id:'WM-ALLOC-001',treasuryPct:50,orangeChipPct:20,contractHolderPct:30,effectiveFrom:'2026-08-28',status:'ACTIVE'
}

export function validateAllocationRule(rule: ProductionAllocationRule){
  const total = rule.treasuryPct + rule.orangeChipPct + rule.contractHolderPct
  return Math.abs(total - 100) < 0.000001
}

export function allocateNetBtc(netBtc:number, rule:ProductionAllocationRule = activeAllocationRule){
  if(!validateAllocationRule(rule)) throw new Error('Mining allocation must total 100%')
  if(netBtc < 0) throw new Error('Net BTC cannot be negative')
  return {
    treasuryBtc: netBtc * rule.treasuryPct / 100,
    orangeChipBtc: netBtc * rule.orangeChipPct / 100,
    contractHolderBtc: netBtc * rule.contractHolderPct / 100
  }
}

export const genesisProduction: MiningProductionRecord = (()=>{
  const netBtc = 0.1
  const allocation = allocateNetBtc(netBtc)
  return {
    id:'WM-PROD-GENESIS-001',minerId:WORLD_MINT_GENESIS_MINER_ID,
    periodStart:'2026-08-28T00:00:00Z',periodEnd:'2026-08-28T23:59:59Z',
    grossBtc:0.105,poolFeesBtc:0.002,operatingCostBtc:0.003,netBtc,
    ...allocation,verificationStatus:'SIMULATED'
  }
})()
