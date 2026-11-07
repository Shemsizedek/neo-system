// TEST ONLY: deliberately killed after a durable dispatch record.
import { createSqliteApprovalStore } from '../../server/neo-vm/approval-store.mjs'
const store=createSqliteApprovalStore({filename:process.argv[2],now:()=>1100})
process.once('message',record=>{
  store.prepareSigningAttempt(record)
  store.advanceSigningAttempt(record.requestId,record.ownerHash,'DISPATCHED')
  process.send({committed:true})
})
