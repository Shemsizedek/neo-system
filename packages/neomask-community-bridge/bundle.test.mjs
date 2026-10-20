import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const sandbox={crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,DataView,console};
vm.createContext(sandbox);vm.runInContext(await readFile(new URL('./dist/freewallet-bridge.js',import.meta.url),'utf8'),sandbox);
assert.equal(typeof sandbox.NeoMaskFreewallet.startFreewalletCompanion,'function');
assert.throws(()=>sandbox.NeoMaskFreewallet.startFreewalletCompanion({}, {ledger:'cp20',merchantOrigin:'https://evil.example',allowedMerchants:['https://holytemples.org']}),/not approved/);
console.log('Standalone browser bundle loads without remote imports; unapproved merchant rejected.');
