import {openSync, fstatSync, readFileSync, closeSync, constants} from 'node:fs';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createStore} from './store.mjs';
import {createSandboxReceiptIssuer} from './cloudSandboxEmitter.mjs';

function privateFile(path, {read = true} = {}) {
  if (typeof path !== 'string' || !isAbsolute(path)) throw Error('PRIVATE_ABSOLUTE_PATH_REQUIRED');
  const fd=openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat=fstatSync(fd);
    if (!stat.isFile() || (stat.mode & 0o077) || stat.nlink !== 1 ||
        (process.getuid && stat.uid !== process.getuid()) || (read && stat.size > 16384)) throw Error('PRIVATE_FILE_INVALID');
    return read ? readFileSync(fd,'utf8') : null;
  } finally {closeSync(fd);}
}

/** Explicit local operator command. No provider access, secret creation, payment or HTTP import. */
export function provisionCounterSandboxInvoice({env=process.env,now=Date.now}={}) {
  if (env.NEO_COUNTER_SANDBOX_ENABLED !== 'true' || env.NEO_COUNTER_SANDBOX_IMPORT_APPROVED !== 'true') throw Error('SANDBOX_IMPORT_NOT_APPROVED');
  // The database must already exist and be owner-only, on an authorized durable host.
  privateFile(env.NEO_COUNTER_DB_PATH,{read:false});
  const order=JSON.parse(privateFile(env.NEO_COUNTER_SANDBOX_ORDER_FILE));
  const store=createStore(env.NEO_COUNTER_DB_PATH);
  try {
    const issuer=createSandboxReceiptIssuer(store,{merchantId:env.NEO_COUNTER_SANDBOX_MERCHANT_ID,
      secret:env.NEO_COUNTER_SANDBOX_RECEIPT_SECRET,now});
    const imported=issuer.provisionInvoice(order);
    return {gate:'NEO-CLOUD-002B',environment:'sandbox',status:'TRUSTED_TEST_INVOICE_IMPORTED',
      replayed:imported.replayed,paymentVerified:false,purchasesEnabled:false,tokenIssuanceEnabled:false};
  } finally {store.close();}
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {console.log(JSON.stringify(provisionCounterSandboxInvoice(),null,2));}
  catch {console.log(JSON.stringify({gate:'NEO-CLOUD-002B',status:'SANDBOX_INVOICE_IMPORT_BLOCKED',paymentVerified:false}));process.exitCode=2;}
}
