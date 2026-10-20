// Install only inside a trusted Freewallet fork/companion, never on a merchant page.
import {createWalletHost,servePopupBridge} from './index.mjs';
import {reviewPsbt,psbtDigest,signReviewedPsbt} from '../../apps/neomask-extension/src/wallet.mjs';
export function createFreewalletCompanion({runtime,ledger,approve}){
 if(!['classic','cp20'].includes(ledger)||typeof approve!=='function')throw Error('Explicit ledger and trusted approval UI required.');
 const read=()=>{
  if(!runtime.getWallet())throw Error('Unlock Freewallet first.');
  if(Number(runtime.FW.WALLET_NETWORK)!==1)throw Error('Choose Bitcoin mainnet.');
  const address=runtime.FW.WALLET_ADDRESS,info=runtime.getWalletAddressInfo(address);
  if(!info||![1,2].includes(Number(info.type))||!/^1[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(address||''))throw Error('Choose an indexed or imported Legacy signing account.');
  return {address,network:'mainnet',ledger,signingAvailable:true};
 };
 const wallet={connect:async()=>read(),getAccount:async()=>read(),disconnect:async()=>{},
  async signPsbt(hex,requestedLedger,options){
   const a=read();if(requestedLedger!==ledger)throw Error('Wallet ledger mismatch.');
   const summary=reviewPsbt(hex,a.address,ledger);
   const indices=options.signInputs[a.address];
   if(indices.length!==summary.inputs||new Set(indices).size!==summary.inputs||!indices.every(i=>i<summary.inputs))throw Error('Freewallet companion requires all owned inputs.');
   // Key access occurs only in the trusted wallet process, after host approval.
   const wif=runtime.getPrivateKey('mainnet',a.address);
   if(typeof wif!=='string')throw Error('Signing account unavailable.');
   const result=await signReviewedPsbt({hex,wif,approvedDigest:await psbtDigest(hex),ledger});
   if(read().address!==a.address)throw Error('Account changed during signing.');return result.psbtHex;
  }
 };
 return createWalletHost({wallet,ledgers:[ledger],approve:async request=>{
  const a=read();
  const summary=request.method==='signPsbt'?reviewPsbt(request.hex,a.address,ledger):null;
  return (await approve({...request,summary}))===true;
 }});
}
export function installFreewalletPopup(scope,{runtime,ledger,merchantOrigin,approve}){
 return servePopupBridge(scope,{merchantOrigin,request:createFreewalletCompanion({runtime,ledger,approve})});
}
// Supply these globals from the Freewallet application's own trusted context.
export function freewalletRuntime(scope){
 for(const name of ['getWallet','getWalletAddressInfo','getPrivateKey'])if(typeof scope[name]!=='function')throw Error('Freewallet runtime missing '+name);
 if(!scope.FW)throw Error('Freewallet state unavailable.');
 return {FW:scope.FW,getWallet:scope.getWallet.bind(scope),getWalletAddressInfo:scope.getWalletAddressInfo.bind(scope),getPrivateKey:scope.getPrivateKey.bind(scope)};
}
