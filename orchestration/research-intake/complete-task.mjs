import { verifyReceipt } from './receipt.mjs';
// db and keyRegistry are trusted server-side adapters, never request-supplied.
export async function completeTask(db, keyRegistry, authenticatedOwner, receipt, signature) {
  if (typeof authenticatedOwner !== 'string' || !receipt || receipt.owner_id !== authenticatedOwner) return false;
  const row = await db.query("SELECT task_id,payload_hash,owner_id FROM neo_relay.tasks WHERE task_id=$1 AND owner_id=$2 AND state='CLAIMED'", [receipt.task_id,authenticatedOwner]);
  if (row.rows.length !== 1) return false;
  const expected = row.rows[0];
  const key = await keyRegistry.getActivePublicKey(authenticatedOwner);
  const hash = verifyReceipt(receipt,signature,key,expected);
  if (!hash) return false;
  const result = await db.query("UPDATE neo_relay.tasks SET state='COMPLETED',receipt_hash=$3 WHERE task_id=$1 AND owner_id=$2 AND state='CLAIMED' AND payload_hash=$4 RETURNING task_id", [expected.task_id,authenticatedOwner,hash,expected.payload_hash]);
  return result.rows.length === 1;
}
