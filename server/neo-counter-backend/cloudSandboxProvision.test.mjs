import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,chmodSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from './store.mjs';
import {provisionCounterSandboxInvoice} from './cloudSandboxProvision.mjs';
const NOW=Date.parse('2026-10-23T20:00:00.000Z');
const order={environment:'sandbox',network:'testnet3',currency:'BTC_TESTNET',service:'neo-miner',
  provider:'NICEHASH_TESTNET',providerOrderId:'00000000-0000-4000-8000-000000000001',
  orderId:'fixture-order',merchantId:'fixture-merchant',customerId:'fixture-customer',amountSats:1000,
  minConfirmations:3,scriptPubKey:'0014'+'c'.repeat(40),createdAt:new Date(NOW-1000).toISOString(),expiresAt:new Date(NOW+100000).toISOString()};
test('explicit approved provisioning requires owner-only regular input and existing protected DB',()=>{
  const dir=mkdtempSync(join(tmpdir(),'neo-private-import-')),dbPath=join(dir,'counter.sqlite'),orderFile=join(dir,'order.json');
  const env={NEO_COUNTER_SANDBOX_ENABLED:'true',NEO_COUNTER_SANDBOX_IMPORT_APPROVED:'true',
    NEO_COUNTER_DB_PATH:dbPath,NEO_COUNTER_SANDBOX_ORDER_FILE:orderFile,
    NEO_COUNTER_SANDBOX_MERCHANT_ID:order.merchantId,NEO_COUNTER_SANDBOX_RECEIPT_SECRET:'fixture-secret-at-least-32-characters-long'};
  try {
    assert.throws(()=>provisionCounterSandboxInvoice({env:{}}),/NOT_APPROVED/);
    const store=createStore(dbPath);store.close();chmodSync(dbPath,0o600);
    writeFileSync(orderFile,JSON.stringify(order),{mode:0o600});
    const result=provisionCounterSandboxInvoice({env,now:()=>NOW});assert.equal(result.paymentVerified,false);
    assert.equal(result.status,'TRUSTED_TEST_INVOICE_IMPORTED');
    assert.equal(provisionCounterSandboxInvoice({env,now:()=>NOW}).replayed,true);
    chmodSync(orderFile,0o644);assert.throws(()=>provisionCounterSandboxInvoice({env,now:()=>NOW}),/PRIVATE_FILE_INVALID/);
    chmodSync(orderFile,0o600);const link=join(dir,'link.json');symlinkSync(orderFile,link);
    assert.throws(()=>provisionCounterSandboxInvoice({env:{...env,NEO_COUNTER_SANDBOX_ORDER_FILE:link},now:()=>NOW}));
    assert.throws(()=>provisionCounterSandboxInvoice({env:{...env,NEO_COUNTER_DB_PATH:'relative.sqlite'},now:()=>NOW}),/ABSOLUTE/);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
