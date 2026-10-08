import {randomBytes,createHash} from 'node:crypto';
import {validateNmniIdentity} from './nmni-registry.mjs';
// NEOB-007: verification is NOT implemented. Challenges are one-time proofs pending trusted signer integration.
export function newWalletChallenge({accountId,network,address,now=Date.now()}){
 if(!accountId||!['bitcoin-mainnet','bitcoin-testnet','counterparty-mainnet'].includes(network)||typeof address!=='string'||address.length<14||address.length>120)throw new Error('invalid_wallet_challenge');
 const nonce=randomBytes(24).toString('hex'),expiresAt=new Date(now+300000).toISOString();
 return {challengeId:createHash('sha256').update(nonce).digest('hex'),message:'NEO BANK WALLET OWNERSHIP ONLY\\nAccount: '+accountId+'\\nNetwork: '+network+'\\nAddress: '+address+'\\nNonce: '+nonce+'\\nExpires: '+expiresAt,expiresAt,status:'UNVERIFIED',broadcast:false};
}
export function routingDescriptor(nmniBinding,walletBinding){
 if(!nmniBinding||nmniBinding.verificationStatus!=='VERIFIED')return {status:'BLOCKED',reason:'nmni_identity_unverified'};
 validateNmniIdentity(nmniBinding.nmniAccountId);
 if(!walletBinding||walletBinding.verificationStatus!=='VERIFIED'||walletBinding.nmniAccountId!==nmniBinding.nmniAccountId)return {status:'BLOCKED',reason:'wallet_control_unverified'};
 return {status:'VERIFIED_BINDING_ONLY',alias:'NEO:'+nmniBinding.nmniAccountId,network:walletBinding.network,address:walletBinding.address,transfersEnabled:false};
}
export function cesConnectorStatus(){return {mode:'READ_ONLY',adapter:'NOT_AUTHORIZED',sync:'NOT_CONFIGURED',legacyLoginAutomation:false,balancesVerified:false};}
