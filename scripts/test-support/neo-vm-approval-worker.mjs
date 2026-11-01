// TEST ONLY: independent processes competing for the same fixture nonce.
import { createSqliteApprovalStore } from '../../server/neo-vm/approval-store.mjs'

const store = createSqliteApprovalStore({ filename: process.argv[2], now: () => 1_100 })
process.once('message', ({ nonceKey, context, abrupt }) => {
  try {
    const consumed = store.consumeApproval(nonceKey, 1_200, context)
    if (!abrupt) store.close()
    process.send({ consumed }, () => process.exit(0))
  } catch (error) { process.send({ error: error.code || error.message }, () => process.exit(1)) }
})
process.send({ ready: true })
