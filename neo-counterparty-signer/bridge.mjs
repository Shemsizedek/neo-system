import {WalletSession,configureWalletSdk,composeAndBroadcast} from '@xcp/wallet-sdk';
import {discoverWallets,XCP_WALLET} from '@xcp/wallet-sdk/web';
import {verifyFunding,readTx} from './policy.mjs';
export function createNeoSigner({origin=location.origin,storage=localStorage,onState=()=>{},onReview=async()=>true}={}){
 configureWalletSdk({counterpartyApiBase:origin+'/api/signer/v2',storage});
 const session=new WalletSession({wallets:discoverWallets([XCP_WALLET]),origin});session.subscribe(()=>onState(session.getState()));session.start();
 let busy=false,epoch=0,identity='';session.subscribe(()=>{const s=session.getState(),v=JSON.stringify([s.address,s.readyState,s.wallet?.id]);if(v!==identity){epoch++;identity=v;}});
 async function assertIdentity(intent){const provider=window.xcpwallet;if(!provider)throw Error('Install XCP Wallet in this browser first');const [network,accounts]=await Promise.all([provider.request({method:'xcp_getNetwork'}),provider.request({method:'xcp_accounts'})]);if(network!=='mainnet'||accounts[0]!==intent.source||session.address!==intent.source)throw Error('Select the exact issuer address on Bitcoin mainnet');}
 const key=i=>'neo.issuance.v1:'+i.source+':'+i.asset;
 return {session,connect:async()=>{await session.connect('xcp');const s=session.getState();if(!s.address||s.readyState!=='connected')throw Error(s.lastError?.message||'XCP Wallet is unavailable. Install it in this browser, then reload.');},disconnect:()=>session.disconnect(),
 async issue(intent,{feeRate=2,maxFeeSats=20000}={}){
 if(busy)throw Error('An issuance is already in progress');if(storage.getItem(key(intent)))throw Error('A prior submission exists. Check its transaction before issuing again.');
 if(!Number.isFinite(feeRate)||feeRate<1||feeRate>100||!Number.isSafeInteger(maxFeeSats)||maxFeeSats<1||maxFeeSats>100000)throw Error('Invalid fee limits');
 busy=true;try{await assertIdentity(intent);const marker=epoch;let verifiedRaw=null;
 const signer={get address(){return session.address;},get publicKey(){return session.publicKey;},get connectionProof(){return session.connectionProof;},
 async signTransaction(raw){if(storage.getItem(key(intent)))throw Error('A prior submission exists; check its outcome first');await assertIdentity(intent);const facts=await verifyFunding(raw,intent,maxFeeSats,async id=>{const r=await fetch(origin+'/api/signer/v2/bitcoin/transactions/'+id);const j=await r.json();if(!r.ok||!j.result?.hex)throw Error('Cannot verify funding transaction');return j.result.hex;});if(marker!==epoch)throw Error('Wallet state changed; rebuild the request');if(!await onReview({intent,feeSats:facts.feeSats,maxFeeSats}))throw Error('Review cancelled');await assertIdentity(intent);if(marker!==epoch)throw Error('Wallet state changed');verifiedRaw=raw;return session.signTransaction(raw);},
 async broadcastTransaction(signed){await assertIdentity(intent);if(marker!==epoch)throw Error('Wallet changed after signing');if(!verifiedRaw||Array.from(readTx(verifiedRaw).unsignedTx).join(',')!==Array.from(readTx(signed).unsignedTx).join(','))throw Error('Signed transaction differs from reviewed transaction');const txid=readTx(signed).id;storage.setItem(key(intent),JSON.stringify({txid,status:'broadcast_attempted',intent,createdAt:new Date().toISOString()}));try{const returned=await session.broadcastTransaction(signed);if(returned!==txid)throw Error('Relay transaction ID mismatch');storage.setItem(key(intent),JSON.stringify({txid,status:'submitted',intent,createdAt:new Date().toISOString()}));return txid;}catch(e){throw Error('Broadcast outcome requires verification. Transaction '+txid+'. '+e.message);}}};
 return await composeAndBroadcast(signer,'issuance',{asset:intent.asset,quantity:intent.quantity,divisible:intent.divisible,lock:intent.lock,reset:intent.reset,description:intent.description,encoding:'opreturn',max_fee:maxFeeSats},{feeRate});
 }finally{busy=false;}}
 };
}
