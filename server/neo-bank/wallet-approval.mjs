// NEOB-017. Production transfer approval is fail-closed until a trusted,
// durable NeoMask verifier is configured. No client assertion is trusted.
import {createHash} from 'node:crypto';

export function transferApprovalDigest(subject, transfer) {
  if (!subject || !transfer || !/^[A-Za-z0-9_-]{8,100}$/.test(String(transfer.idempotencyKey||''))) {
    throw new Error('wallet_approval_invalid_intent');
  }
  const amount=Number(transfer.amount);
  if (!Number.isFinite(amount) || amount<=0 || !Number.isSafeInteger(Math.round(amount*100))) {
    throw new Error('wallet_approval_invalid_intent');
  }
  const canonical=JSON.stringify({
    domain:'NEOB-017/CES/TRANSFER/v1',
    subject:String(subject),
    toAccount:String(transfer.toAccount||''),
    amountMinor:Math.round(amount*100),
    currency:'NOMNI',
    memo:String(transfer.memo||''),
    idempotencyKey:String(transfer.idempotencyKey)
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export async function requireWalletApproval({subject,transfer,approval,verifyApproval}) {
  if(typeof verifyApproval!=='function') throw new Error('wallet_approval_unavailable');
  const digest=transferApprovalDigest(subject,transfer);
  if(!approval || typeof approval!=='object' || Array.isArray(approval)) throw new Error('wallet_approval_required');
  // verifyApproval must validate a one-time challenge, WebAuthn assertion or
  // enrolled public-key signature, authenticated subject, origin/RP, expiry,
  // tenant, action, exact digest, and atomically consume the approval in
  // persistent storage. Returning false or throwing always fails closed.
  if(await verifyApproval({subject,digest,approval,operation:'ces.transfer'})!==true)
    throw new Error('wallet_approval_rejected');
  return digest;
}
