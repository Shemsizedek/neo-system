import {assertProductionRecord, SATOSHIS_PER_BTC, type MiningProductionRecord} from './worldMint'

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

export interface BitcoinTxOutput {
  address?: string
  amountBtc: number
  vout: number
}

export interface BitcoinTxEvidence {
  txid: string
  confirmations: number
  blockHeight?: number
  blockHash?: string
  outputs: BitcoinTxOutput[]
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

export interface PayoutExpectation {
  wallet: WatchOnlyWallet
  amountBtc: number
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

function btcToSats(value:number){
  if(!Number.isFinite(value) || value < 0) throw new Error('BTC values must be finite and non-negative')
  return Math.round(value * SATOSHIS_PER_BTC)
}

function normalizedAddress(value:string){
  return value.trim()
}

export async function verifyPayoutEvidence(
  rpc:BitcoinRpcAdapter,
  txid:string,
  expectation:PayoutExpectation,
  policy:PayoutVerificationPolicy = defaultPayoutVerificationPolicy
):Promise<PayoutVerificationResult> {
  const errors:string[] = []
  if(!isTxid(txid)) return {verified:false, errors:['Payout TXID must be a valid 64-hex Bitcoin transaction ID']}
  if(!Number.isInteger(policy.minConfirmations) || policy.minConfirmations < 1) {
    return {verified:false, errors:['Minimum confirmations must be an integer of at least 1']}
  }
  if(expectation.wallet.status !== 'ACTIVE') {
    return {verified:false, errors:['Expected payout wallet must be ACTIVE']}
  }
  if(typeof expectation.wallet.address !== 'string' || !expectation.wallet.address.trim()) {
    return {verified:false, errors:['Expected payout wallet must provide a watch-only Bitcoin address']}
  }

  let expectedSats:number
  try {
    expectedSats = btcToSats(expectation.amountBtc)
  } catch (error) {
    return {verified:false, errors:[error instanceof Error ? error.message : 'Invalid expected payout amount']}
  }
  if(expectedSats < 1) return {verified:false, errors:['Expected payout amount must be at least one satoshi']}

  const evidence = await rpc.getTransaction(txid)
  if(!evidence) return {verified:false, errors:['Bitcoin transaction was not found by the configured watch-only node']}
  if(evidence.txid.toLowerCase() !== txid.toLowerCase()) errors.push('RPC transaction ID does not match requested payout TXID')
  if(!Number.isInteger(evidence.confirmations) || evidence.confirmations < policy.minConfirmations) {
    errors.push(`Bitcoin payout requires at least ${policy.minConfirmations} confirmation(s)`)
  }
  if(policy.requireBlockHeight && (!Number.isInteger(evidence.blockHeight) || (evidence.blockHeight ?? -1) < 0)) {
    errors.push('Bitcoin payout requires confirmed block-height evidence')
  }

  const expectedAddress = normalizedAddress(expectation.wallet.address)
  const matchingOutputs = evidence.outputs.filter(output => output.address && normalizedAddress(output.address) === expectedAddress)
  const matchedSats = matchingOutputs.reduce((sum, output) => {
    try {
      return sum + btcToSats(output.amountBtc)
    } catch {
      return sum
    }
  }, 0)

  if(matchingOutputs.length === 0) {
    errors.push('Bitcoin payout transaction does not pay the expected watch-only destination address')
  } else if(matchedSats !== expectedSats) {
    errors.push(`Bitcoin payout amount does not match expected amount: expected ${expectedSats} sats, observed ${matchedSats} sats`)
  }

  const verifiedEvidence:BitcoinTxEvidence = {
    ...evidence,
    destinationAddress:expectedAddress,
    amountBtc:matchedSats / SATOSHIS_PER_BTC
  }

  return {verified:errors.length === 0, errors, evidence:verifiedEvidence}
}

export async function promoteProductionFromPayout(
  record:MiningProductionRecord,
  rpc:BitcoinRpcAdapter,
  txid:string,
  expectation:PayoutExpectation,
  policy:PayoutVerificationPolicy = defaultPayoutVerificationPolicy
):Promise<MiningProductionRecord> {
  if(record.verificationStatus === 'SIMULATED') {
    throw new Error('Simulated mining production cannot be promoted using live Bitcoin settlement evidence')
  }

  const result = await verifyPayoutEvidence(rpc, txid, expectation, policy)
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
    const blockHash = typeof raw.blockhash === 'string' ? raw.blockhash : undefined
    let blockHeight:number|undefined
    if(blockHash) {
      const header = await this.request(this.endpoint, 'getblockheader', [blockHash, true]) as Record<string, unknown> | null
      const height = Number(header?.height)
      if(Number.isInteger(height) && height >= 0) blockHeight = height
    }

    const outputs = Array.isArray(raw.vout)
      ? raw.vout.map((entry, index):BitcoinTxOutput => {
          const output = entry as Record<string, unknown>
          const script = output.scriptPubKey as Record<string, unknown> | undefined
          const amount = Number(output.value)
          const vout = Number(output.n ?? index)
          const address = typeof script?.address === 'string'
            ? script.address
            : Array.isArray(script?.addresses) && typeof script.addresses[0] === 'string'
              ? script.addresses[0]
              : undefined
          return {
            address,
            amountBtc:Number.isFinite(amount) && amount >= 0 ? amount : 0,
            vout:Number.isInteger(vout) && vout >= 0 ? vout : index
          }
        })
      : []

    return {
      txid:String(raw.txid ?? txid),
      confirmations:Number.isInteger(confirmations) && confirmations >= 0 ? confirmations : 0,
      blockHeight,
      blockHash,
      outputs
    }
  }
}
