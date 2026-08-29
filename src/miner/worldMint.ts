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

export interface ProductionVerificationResult {
  valid: boolean
  errors: string[]
}

export const WORLD_MINT_GENESIS_MINER_ID = 'NEOMINER-WM-0001'
export const SATOSHIS_PER_BTC = 100_000_000

export const worldMintAccounts: MiningAccount[] = [
  {id:'WM-TREASURY-001',name:'World Mint Treasury Mining Account',kind:'TREASURY',settlementAsset:'BTC',status:'ACTIVE'},
  {id:'WM-ORANGE-001',name:'Orange Chip Mining Reserve Account',kind:'ORANGE_CHIP_RESERVE',settlementAsset:'BTC',status:'ACTIVE'},
  {id:'WM-OPS-001',name:'NEO Miner Operations Account',kind:'OPERATIONS',settlementAsset:'WORLD_CURRENCY',status:'ACTIVE'}
]

export const activeAllocationRule: ProductionAllocationRule = {
  id:'WM-ALLOC-001',treasuryPct:50,orangeChipPct:20,contractHolderPct:30,effectiveFrom:'2026-08-28',status:'ACTIVE'
}

export function validateAllocationRule(rule: ProductionAllocationRule){
  const values = [rule.treasuryPct, rule.orangeChipPct, rule.contractHolderPct]
  if(values.some(value => !Number.isFinite(value) || value < 0 || value > 100)) return false
  const total = values.reduce((sum, value) => sum + value, 0)
  return Math.abs(total - 100) < 0.000001
}

function btcToSats(value:number){
  if(!Number.isFinite(value) || value < 0) throw new Error('BTC values must be finite and non-negative')
  return Math.round(value * SATOSHIS_PER_BTC)
}

export function allocateNetBtc(netBtc:number, rule:ProductionAllocationRule = activeAllocationRule){
  if(!validateAllocationRule(rule)) throw new Error('Mining allocation must total 100%')
  const netSats = btcToSats(netBtc)
  const treasurySats = Math.floor(netSats * rule.treasuryPct / 100)
  const orangeChipSats = Math.floor(netSats * rule.orangeChipPct / 100)
  const contractHolderSats = netSats - treasurySats - orangeChipSats
  return {
    treasuryBtc: treasurySats / SATOSHIS_PER_BTC,
    orangeChipBtc: orangeChipSats / SATOSHIS_PER_BTC,
    contractHolderBtc: contractHolderSats / SATOSHIS_PER_BTC
  }
}

export function verifyProductionRecord(record:MiningProductionRecord):ProductionVerificationResult {
  const errors:string[] = []
  const numericValues = [
    record.grossBtc, record.poolFeesBtc, record.operatingCostBtc, record.netBtc,
    record.treasuryBtc, record.orangeChipBtc, record.contractHolderBtc
  ]

  if(numericValues.some(value => !Number.isFinite(value) || value < 0)) {
    errors.push('BTC amounts must be finite and non-negative')
    return {valid:false, errors}
  }

  const grossSats = btcToSats(record.grossBtc)
  const accountedSats = btcToSats(record.poolFeesBtc) + btcToSats(record.operatingCostBtc) + btcToSats(record.netBtc)
  if(grossSats !== accountedSats) errors.push('Gross BTC must equal pool fees + operating cost + net BTC')

  const netSats = btcToSats(record.netBtc)
  const allocatedSats = btcToSats(record.treasuryBtc) + btcToSats(record.orangeChipBtc) + btcToSats(record.contractHolderBtc)
  if(netSats !== allocatedSats) errors.push('Treasury + Orange Chip + contract-holder BTC must equal net BTC')

  const hasTxid = typeof record.txid === 'string' && /^[0-9a-fA-F]{64}$/.test(record.txid)
  const hasBlockHeight = Number.isInteger(record.blockHeight) && (record.blockHeight ?? -1) >= 0
  const hasConfirmation = Number.isInteger(record.confirmations) && (record.confirmations ?? 0) >= 1
  const hasAnySettlementEvidence = record.txid !== undefined || record.blockHeight !== undefined || record.confirmations !== undefined

  if(record.verificationStatus === 'VERIFIED') {
    if(!hasTxid) errors.push('VERIFIED production requires a valid 64-hex Bitcoin transaction ID')
    if(!hasBlockHeight) errors.push('VERIFIED production requires a non-negative Bitcoin block height')
    if(!hasConfirmation) errors.push('VERIFIED production requires at least one Bitcoin confirmation')
  }

  if(record.verificationStatus === 'SIMULATED' && hasAnySettlementEvidence) {
    errors.push('SIMULATED production cannot carry live Bitcoin settlement evidence')
  }

  return {valid:errors.length === 0, errors}
}

export function assertProductionRecord(record:MiningProductionRecord){
  const result = verifyProductionRecord(record)
  if(!result.valid) throw new Error(`Invalid mining production record: ${result.errors.join('; ')}`)
  return record
}

export const genesisProduction: MiningProductionRecord = (()=>{
  const netBtc = 0.1
  const allocation = allocateNetBtc(netBtc)
  const record: MiningProductionRecord = {
    id:'WM-PROD-GENESIS-001',minerId:WORLD_MINT_GENESIS_MINER_ID,
    periodStart:'2026-08-28T00:00:00Z',periodEnd:'2026-08-28T23:59:59Z',
    grossBtc:0.105,poolFeesBtc:0.002,operatingCostBtc:0.003,netBtc,
    ...allocation,verificationStatus:'SIMULATED'
  }
  return assertProductionRecord(record)
})()
