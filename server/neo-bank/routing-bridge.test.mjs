import test from 'node:test';
import assert from 'node:assert/strict';
import {newWalletChallenge,routingDescriptor,cesConnectorStatus} from './routing-bridge.mjs';

test('unverified CES identities never resolve to wallet addresses',()=>{
 assert.deepEqual(routingDescriptor(null,null),{status:'BLOCKED',reason:'nmni_identity_unverified'});
 const binding={nmniAccountId:'NMNI0002',verificationStatus:'VERIFIED'};
 assert.deepEqual(routingDescriptor(binding,null),{status:'BLOCKED',reason:'wallet_control_unverified'});
 assert.equal(routingDescriptor(binding,{nmniAccountId:'NMNI0002',verificationStatus:'VERIFIED',network:'bitcoin-mainnet',address:'bc1qexampleaddress'}) .transfersEnabled,false);
});
test('wallet challenges never broadcast and must expire',()=>{
 const challenge=newWalletChallenge({accountId:'NMNI0002',network:'bitcoin-mainnet',address:'bc1qexampleaddress',now:0});
 assert.equal(challenge.status,'UNVERIFIED');
 assert.equal(challenge.broadcast,false);
 assert.equal(challenge.expiresAt,'1970-01-01T00:05:00.000Z');
});
test('CES connector is disabled until approved',()=>{
 const status=cesConnectorStatus();
 assert.equal(status.legacyLoginAutomation,false);
 assert.equal(status.balancesVerified,false);
});
