import { createHash } from "node:crypto";

// Durable approval receipts are append-only. A signed review can be recorded
// before publication; a subsequent release must independently re-read the
// published WordPress content and check the same signed digest.
export function approvalReceiptId(approval) {
  if (!approval || !Number.isSafeInteger(approval.postId) ||
      !/^[a-f0-9]{64}$/.test(approval.contentSha256 || "") ||
      !/^[a-f0-9]{64}$/.test(approval.signature || "")) {
    throw new Error("approval_receipt_invalid");
  }
  return "review-" + approval.postId + "-" + approval.contentSha256.slice(0,16);
}

export async function persistApprovalReceipt(approval, pool) {
  if (!pool || typeof pool.query !== "function") throw new Error("approval_ledger_unavailable");
  const id = approvalReceiptId(approval);
  const payload = JSON.stringify(approval);
  const digest = createHash("sha256").update(payload).digest("hex");
  const inserted = await pool.query(
    "INSERT INTO neo_bulletin.editorial_approvals (id, post_id, content_sha256, approval, approval_sha256) " +
    "VALUES ($1, $2, $3, $4::jsonb, $5) ON CONFLICT (id) DO NOTHING RETURNING id",
    [id, approval.postId, approval.contentSha256, payload, digest]
  );
  if (inserted.rows?.length === 1) return {status:"recorded",id,durability:"database"};
  const existing = await pool.query(
    "SELECT approval_sha256 FROM neo_bulletin.editorial_approvals WHERE id = $1", [id]
  );
  if (existing.rows?.length !== 1) throw new Error("approval_ledger_concurrent_write_unresolved");
  if (existing.rows[0].approval_sha256 !== digest) throw new Error("approval_receipt_conflict");
  return {status:"already_recorded",id,durability:"database"};
}
