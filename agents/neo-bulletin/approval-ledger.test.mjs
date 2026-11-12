import test from "node:test";
import assert from "node:assert/strict";
import {approvalReceiptId,persistApprovalReceipt} from "./approval-ledger.mjs";

const approval = {
  postId:3868, slug:"neo-bulletin-2026-11-11-wednesday",
  contentSha256:"a".repeat(64),signature:"b".repeat(64),
  approvedBy:"verified-editor",type:"education",
  approvedAt:"2026-11-11T19:00:00.000Z"
};

test("receipt uses stable content fingerprint and parameterized insert", async()=>{
  const calls = [];
  const pool={query:async(sql,args)=>{calls.push({sql,args});return {rows:[{id:approvalReceiptId(approval)}]};}};
  const result=await persistApprovalReceipt(approval,pool);
  assert.equal(result.status,"recorded");
  assert.equal(result.durability,"database");
  assert.match(calls[0].sql,/ON CONFLICT \(id\) DO NOTHING/);
  assert.equal(calls[0].args[1],3868);
  assert.equal(calls[0].args[2],"a".repeat(64));
});
test("identical retry is idempotent; changed approval conflicts",async()=>{
  let hash;
  const pool={query:async(sql,args)=>{
    if(sql.startsWith("INSERT")){if(!hash) hash=args[4];return {rows:[]};}
    return {rows:[{approval_sha256:hash}]};
  }};
  assert.equal((await persistApprovalReceipt(approval,pool)).status,"already_recorded");
  await assert.rejects(()=>persistApprovalReceipt({...approval,approvedBy:"different"},pool),/approval_receipt_conflict/);
});
test("missing signature or database fails closed",async()=>{
  assert.throws(()=>approvalReceiptId({...approval,signature:"fake"}),/approval_receipt_invalid/);
  await assert.rejects(()=>persistApprovalReceipt(approval,null),/approval_ledger_unavailable/);
});
