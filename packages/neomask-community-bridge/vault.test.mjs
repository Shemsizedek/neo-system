import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {connectNeoMaskVault} from './neomask-vault.mjs';
import {installNeoPayWalletBridge} from '../../apps/neopay/neomask.mjs';
import {installCounterpayWalletBridge} from '../../apps/counterpay/neomask.mjs';
import {createNeoMaskRouter,discoverNeoMaskWallets} from '../../integrations/wordpress/neo-stewardship-counter/neomask-router.mjs';
let address='1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8',signs=0,connects=0,deny=false;
const scope={crypto:webcrypto,location:{origin:'https://holytemples.org'}};
const provider={isNeoMask:true,async connect({ledger}){connects++;return this.getAccount({ledger});},async getAccount({ledger}){return {address,ledger,network:'mainnet',signingAvailable:true};},async disconnect(){},async signPsbt(hex,ledger){signs++;if(deny)throw Error('Approval declined');return {psbtHex:hex};}};
// Test both owned application identities without impersonating Freewallet.
for(const id of ['neopay','counterpay']){
 const isolated={...scope,neoMask:provider};const bridge=(id==='neopay'?installNeoPayWalletBridge:installCounterpayWalletBridge)(isolated);
 const router=discoverNeoMaskWallets(isolated,createNeoMaskRouter());
 await router.connect({walletId:id,ledger:'classic'});assert.equal(signs,0);
 assert.equal(await router.signPsbt('70736274ff00','classic'),'70736274ff00');
 deny=true;await assert.rejects(()=>router.signPsbt('70736274ff00','classic'),/declined/);deny=false;
 address='18SzD3cfwCcV9p6C38ho4uZPHE8ygVB9iq';await assert.rejects(()=>router.getAccount(),/changed/);
 await router.disconnect();await assert.rejects(()=>bridge.getAccount({ledger:'classic'}),/again/);
 address='1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8';signs=0;
}
assert.equal(connects,2);
assert.throws(()=>connectNeoMaskVault(scope,{id:'freewallet',provider}),/identity/);
console.log('Owned wallet → SDK → NeoMask router: connect, approve signing, decline, account change and disconnect passed.');
