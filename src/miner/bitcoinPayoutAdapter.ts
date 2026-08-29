import {assertProductionRecord, type MiningProductionRecord} from './worldMint'

export type BitcoinNetwork = 'mainnet' | 'testnet' | 'signet'
export type WalletRole = 'TREASURY' | 'ORANGE_CHIP' | 'OPERATIONS' | 'CUSTOMER'

export interface WatchOnlyWallet {
  id: string
  role: WalletRole
  network: BitcoinNetwork
  address?: string
  xpubFingerprint?: string
  status: 'ACTIVE' | 'PENDING' | 'DISABLED'
}

export interface BitcoinTxEvidence {
  txid: string
  confirmations: number
  blockHeight?: number
  blockHash?: string
  amountBtc?: number
  destinationAddress?: string
}

export interface BitcoinRpcAdapter {
  getTransaction(txid:string): Promise<BitcoinTxEvidence | null>
}

export interface PayoutVerificationPolicy {
  minConfirmations: number
  requireBlockHeight: boolean
}

export const defaultPayoutVerificationPolicy:PayoutVerificationPolicy = {
  minConfirmations: 1,
  requireBlockHeight: true
}

export interface PayoutVerificationResult {
  verified: boolean
  errors: string[]
  evidence?: BitcoinTxEvidence
}

function isTxid(value:string){
  return /^[0-9a-fA-F]{64}$/.test(value)
}

export async function verifyPayoutEvidence(
  rpc:BitcoinRpcAdapter,
  txid:string,
  policy:PayoutVerificationPolicy = defaultPayoutVerificationPolicy
):Promise<PayoutVerificationResult> {
  const errors:string[] = []
  if(!isTxid(txid)) return {verified:false, errors:['Payout TXID must be a valid 64-hex Bitcoin transaction ID']}
  if(!Number.isInteger(policy.minConfirmations) || policy.minConfirmations < 1) {
    return {verified:false, errors:['Minimum confirmations must be an integer of at least 1']}
  }

  const evidence = await rpc.getTransaction(txid)
  if(!evidence) return {verified:false, errors:['Bitcoin transaction was not found by the configured watch-only node']}
  if(evidence.txid.toLowerCase() !== txid.toLowerCase()) errors.push('RPC transaction ID does not match requested payout TXID')
  if(!Number.isInteger(evidence.confirmations) || evidence.confirmations < policy.minConfirmations) {
    errors.push(`Bitcoin payout requires at least ${policy.minConfirmations} confirmation(s)`)
  }
  if(policy.requireBlockHeight && (!Number.isInteger(evidence.blockHeight) || (evidence.blockHeight ?? -1) < 0)) {
    errors.push('Bitcoin payout requires confirmed block-height evidence')
  }

  return {verified:errors.length === 0, errors, evidence}
}

export async function promoteProductionFromPayout(
  record:MiningProductionRecord,
  rpc:BitcoinRpcAdapter,
  txid:string,
  policy:PayoutVerificationPolicy = defaultPayoutVerificationPolicy
):Promise<MiningProductionRecord> {
  if(record.verificationStatus === 'SIMULATED') {
    throw new Error('Simulated mining production cannot be promoted using live Bitcoin settlement evidence')
  }

  const result = await verifyPayoutEvidence(rpc, txid, policy)
  if(!result.verified || !result.evidence) {
    throw new Error(`Bitcoin payout evidence failed verification: ${result.errors.join('; ')}`)
  }

  const promoted:MiningProductionRecord = {
    ...record,
    verificationStatus:'VERIFIED',
    txid:result.evidence.txid,
    blockHeight:result.evidence.blockHeight,
    confirmations:result.evidence.confirmations
  }

  return assertProductionRecord(promoted)
}

// Transport only: credentials remain outside source control and no signing methods are exposed.
export class BitcoinCoreRpcClient implements BitcoinRpcAdapter {
  constructor(
    private readonly endpoint:string,
    private readonly request:(endpoint:string, method:string, params:unknown[])=>Promise<unknown>
  ) {}

  async getTransaction(txid:string):Promise<BitcoinTxEvidence | null> {
    const raw = await this.request(this.endpoint, 'getrawtransaction', [txid, true]) as Record<string, unknown> | null
    if(!raw) return null
    const confirmations = Number(raw.confirmations ?? 0)
    const blockHeightRaw = raw.blockheight
    return {
      txid:String(raw.txid ?? txid),
      confirmations:Number.isFinite(confirmations) ? confirmations : 0,
      blockHeight:Number.isInteger(blockHeightRaw) ? Number(blockHeightRaw) : undefined,
      blockHash:typeof raw.blockhash === 'string' ? raw.blockhash : undefined
    }
  }
}
