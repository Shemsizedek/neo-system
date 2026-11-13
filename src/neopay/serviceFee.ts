/** Shared Counterpay/NEOpay pricing foundation. Does not collect or broadcast. */
export const WALLET_FEE_POLICY = Object.freeze({
  version: 'NEO-WALLET-FEE-001',
  transferBasisPoints: 9, // 0.09%, not 0.9%
  collectionEnabled: false,
  treasuryAddress: null,
  capSats: null,
})

export type BitcoinServiceFeeQuote = Readonly<{
  policyVersion: string
  recipientSats: bigint
  serviceFeeSats: bigint
  networkFeeSats: bigint
  totalDebitSats: bigint
  capped: boolean
  dustWaived: boolean
}>

const MAX_BITCOIN_SATS = 2_100_000_000_000_000n
function sats(value: bigint, name: string, positive = false) {
  if (typeof value !== 'bigint' || value < (positive ? 1n : 0n) || value > MAX_BITCOIN_SATS) {
    throw new Error(`${name} must be an integer satoshi amount within Bitcoin supply bounds.`)
  }
}

/**
 * BTC transfer preview only. Cap must be supplied explicitly; no hidden minimum.
 * Round down in the sender's favor. Waive outputs below the treasury script's
 * dust threshold instead of converting the service charge into a miner fee.
 * Network fee must be recalculated using the eventual complete output set.
 */
export function quoteBitcoinTransferFee(input: {
  recipientSats: bigint
  networkFeeSats: bigint
  capSats: bigint
  treasuryDustSats: bigint
}): BitcoinServiceFeeQuote {
  sats(input.recipientSats, 'Recipient amount', true)
  sats(input.networkFeeSats, 'Network fee')
  sats(input.capSats, 'Service fee cap', true)
  sats(input.treasuryDustSats, 'Treasury dust threshold', true)
  const calculated = input.recipientSats * BigInt(WALLET_FEE_POLICY.transferBasisPoints) / 10_000n
  const limited = calculated > input.capSats ? input.capSats : calculated
  const dustWaived = limited > 0n && limited < input.treasuryDustSats
  const serviceFeeSats = dustWaived ? 0n : limited
  const totalDebitSats = input.recipientSats + serviceFeeSats + input.networkFeeSats
  sats(totalDebitSats, 'Total debit', true)
  return Object.freeze({
    policyVersion: WALLET_FEE_POLICY.version,
    recipientSats: input.recipientSats,
    serviceFeeSats,
    networkFeeSats: input.networkFeeSats,
    totalDebitSats,
    capped: calculated > input.capSats,
    dustWaived,
  })
}
